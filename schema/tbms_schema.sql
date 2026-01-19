-- ============================================================================
-- Translation Business Management System (TBMS) - PostgreSQL Schema
-- Version: 1.0.0
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text matching
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";  -- For Levenshtein distance

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Account type classification
CREATE TYPE account_type AS ENUM (
    'direct_client',      -- End client with direct relationship
    'agency',             -- Translation agency/LSP
    'enterprise',         -- Large enterprise with multiple subsidiaries
    'subsidiary',         -- Child account of an enterprise
    'prospect',           -- Unverified/potential client
    'vendor'              -- External vendor (for payables tracking)
);

-- Account status
CREATE TYPE account_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'unverified',
    'pending_setup'
);

-- Project status
CREATE TYPE project_status AS ENUM (
    'draft',
    'pending_approval',
    'in_progress',
    'delivered',
    'invoiced',
    'closed',
    'cancelled'
);

-- Job status
CREATE TYPE job_status AS ENUM (
    'pending',
    'assigned',
    'in_progress',
    'review',
    'delivered',
    'approved',
    'rejected',
    'cancelled'
);

-- Finance item type (polymorphic discriminator)
CREATE TYPE finance_item_type AS ENUM (
    'receivable',   -- Linked to Project (client owes us)
    'payable'       -- Linked to Job (we owe vendor)
);

-- Finance item status
CREATE TYPE finance_item_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'invoiced',
    'paid',
    'disputed',
    'written_off'
);

-- Service type
CREATE TYPE service_type AS ENUM (
    'translation_only',
    'tep',                  -- Translation, Editing, Proofreading
    'mtpe',                 -- Machine Translation Post-Editing
    'review_only',
    'transcreation',
    'localization',
    'dtp',                  -- Desktop Publishing
    'subtitling',
    'interpretation'
);

-- ============================================================================
-- ACCOUNT HIERARCHY
-- ============================================================================

CREATE TABLE account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Hierarchy: self-referencing for parent-child relationships
    parent_id UUID REFERENCES account(id) ON DELETE SET NULL,

    -- Core fields
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,  -- Internal account code (e.g., "GOOG-IE")
    type account_type NOT NULL DEFAULT 'prospect',
    status account_status NOT NULL DEFAULT 'unverified',

    -- Contact information
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    billing_email VARCHAR(255),

    -- Financial settings
    currency_code CHAR(3) DEFAULT 'USD',
    payment_terms_days INTEGER DEFAULT 30,
    credit_limit DECIMAL(15, 2),

    -- Default settings
    default_service_type service_type DEFAULT 'tep',
    default_deadline_days INTEGER DEFAULT 3,  -- T+N days

    -- References to pricing
    price_profile_id UUID,  -- FK added after PriceProfile table creation

    -- Metadata
    external_ids JSONB DEFAULT '{}',  -- Store IDs from external systems
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_account_no_self_parent CHECK (parent_id != id)
);

-- Index for hierarchy traversal
CREATE INDEX idx_account_parent_id ON account(parent_id);
CREATE INDEX idx_account_name_trgm ON account USING gin(name gin_trgm_ops);
CREATE INDEX idx_account_status ON account(status);
CREATE INDEX idx_account_type ON account(type);

-- ============================================================================
-- ACCOUNT HIERARCHY: RECURSIVE VIEW FOR FAMILY TREE
-- ============================================================================

-- View to get full family tree (all descendants of an account)
CREATE OR REPLACE VIEW account_family_tree AS
WITH RECURSIVE family_tree AS (
    -- Base case: select all root accounts (or any starting account)
    SELECT
        id,
        parent_id,
        name,
        code,
        type,
        status,
        0 AS depth,
        ARRAY[id] AS path,
        name::TEXT AS hierarchy_path
    FROM account
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: find all children
    SELECT
        a.id,
        a.parent_id,
        a.name,
        a.code,
        a.type,
        a.status,
        ft.depth + 1,
        ft.path || a.id,
        ft.hierarchy_path || ' > ' || a.name
    FROM account a
    INNER JOIN family_tree ft ON a.parent_id = ft.id
)
SELECT * FROM family_tree;

-- Function to get all descendants of a specific account
CREATE OR REPLACE FUNCTION get_account_descendants(root_account_id UUID)
RETURNS TABLE (
    id UUID,
    parent_id UUID,
    name VARCHAR(255),
    code VARCHAR(50),
    type account_type,
    status account_status,
    depth INTEGER,
    path UUID[],
    hierarchy_path TEXT
) AS $$
WITH RECURSIVE descendants AS (
    SELECT
        a.id,
        a.parent_id,
        a.name,
        a.code,
        a.type,
        a.status,
        0 AS depth,
        ARRAY[a.id] AS path,
        a.name::TEXT AS hierarchy_path
    FROM account a
    WHERE a.id = root_account_id

    UNION ALL

    SELECT
        a.id,
        a.parent_id,
        a.name,
        a.code,
        a.type,
        a.status,
        d.depth + 1,
        d.path || a.id,
        d.hierarchy_path || ' > ' || a.name
    FROM account a
    INNER JOIN descendants d ON a.parent_id = d.id
)
SELECT * FROM descendants;
$$ LANGUAGE SQL STABLE;

-- Function to get all ancestors of a specific account
CREATE OR REPLACE FUNCTION get_account_ancestors(child_account_id UUID)
RETURNS TABLE (
    id UUID,
    parent_id UUID,
    name VARCHAR(255),
    code VARCHAR(50),
    type account_type,
    depth INTEGER
) AS $$
WITH RECURSIVE ancestors AS (
    SELECT
        a.id,
        a.parent_id,
        a.name,
        a.code,
        a.type,
        0 AS depth
    FROM account a
    WHERE a.id = child_account_id

    UNION ALL

    SELECT
        a.id,
        a.parent_id,
        a.name,
        a.code,
        a.type,
        anc.depth + 1
    FROM account a
    INNER JOIN ancestors anc ON a.id = anc.parent_id
)
SELECT * FROM ancestors;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- PRICING ENGINE
-- ============================================================================

-- Price Profile: defines CAT tool match discount grid
CREATE TABLE price_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- CAT Grid: JSON defining payment percentages by match type
    -- Example: {"100": 0.10, "99-95": 0.25, "94-85": 0.50, "84-75": 0.75, "74-50": 1.0, "no_match": 1.0, "repetitions": 0.10, "context_match": 0.02, "fuzzy": 0.60}
    cat_grid JSONB NOT NULL DEFAULT '{
        "100": 0.10,
        "context_match": 0.02,
        "repetitions": 0.10,
        "99-95": 0.25,
        "94-85": 0.50,
        "84-75": 0.75,
        "74-50": 1.0,
        "no_match": 1.0
    }',

    -- Minimum charge settings
    minimum_charge DECIMAL(10, 2) DEFAULT 0,
    minimum_charge_currency CHAR(3) DEFAULT 'USD',

    -- Metadata
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure valid JSON structure
    CONSTRAINT chk_cat_grid_valid CHECK (jsonb_typeof(cat_grid) = 'object')
);

CREATE INDEX idx_price_profile_active ON price_profile(is_active);

-- Add FK from Account to PriceProfile
ALTER TABLE account
    ADD CONSTRAINT fk_account_price_profile
    FOREIGN KEY (price_profile_id) REFERENCES price_profile(id) ON DELETE SET NULL;

-- Rate Card: stores base rates per language pair
CREATE TABLE rate_card (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Link to account (client-specific rates) or NULL for default rates
    account_id UUID REFERENCES account(id) ON DELETE CASCADE,

    -- Language pair (ISO 639-1 codes)
    source_language CHAR(5) NOT NULL,  -- e.g., 'en', 'en-US'
    target_language CHAR(5) NOT NULL,  -- e.g., 'de', 'de-DE'

    -- Service type this rate applies to
    service_type service_type NOT NULL DEFAULT 'tep',

    -- Rate information
    rate_per_word DECIMAL(10, 4) NOT NULL,
    rate_per_hour DECIMAL(10, 2),  -- For hourly services
    currency_code CHAR(3) NOT NULL DEFAULT 'USD',

    -- Effective dates for rate versioning
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,  -- NULL means currently active

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint for active rates
    CONSTRAINT uq_rate_card_active UNIQUE NULLS NOT DISTINCT (
        account_id,
        source_language,
        target_language,
        service_type,
        effective_to
    )
);

CREATE INDEX idx_rate_card_account ON rate_card(account_id);
CREATE INDEX idx_rate_card_languages ON rate_card(source_language, target_language);
CREATE INDEX idx_rate_card_effective ON rate_card(effective_from, effective_to);

-- Function to get applicable rate for a language pair
CREATE OR REPLACE FUNCTION get_applicable_rate(
    p_account_id UUID,
    p_source_lang CHAR(5),
    p_target_lang CHAR(5),
    p_service_type service_type DEFAULT 'tep',
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    rate_card_id UUID,
    rate_per_word DECIMAL(10, 4),
    rate_per_hour DECIMAL(10, 2),
    currency_code CHAR(3)
) AS $$
BEGIN
    -- Try client-specific rate first
    RETURN QUERY
    SELECT rc.id, rc.rate_per_word, rc.rate_per_hour, rc.currency_code
    FROM rate_card rc
    WHERE rc.account_id = p_account_id
      AND rc.source_language = p_source_lang
      AND rc.target_language = p_target_lang
      AND rc.service_type = p_service_type
      AND rc.effective_from <= p_date
      AND (rc.effective_to IS NULL OR rc.effective_to >= p_date)
    ORDER BY rc.effective_from DESC
    LIMIT 1;

    -- If no client-specific rate, fall back to default
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT rc.id, rc.rate_per_word, rc.rate_per_hour, rc.currency_code
        FROM rate_card rc
        WHERE rc.account_id IS NULL
          AND rc.source_language = p_source_lang
          AND rc.target_language = p_target_lang
          AND rc.service_type = p_service_type
          AND rc.effective_from <= p_date
          AND (rc.effective_to IS NULL OR rc.effective_to >= p_date)
        ORDER BY rc.effective_from DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PROJECT STRUCTURE
-- ============================================================================

CREATE TABLE project (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE RESTRICT,

    -- Core fields
    project_number VARCHAR(50) UNIQUE NOT NULL,  -- Human-readable ID (e.g., "PRJ-2024-00001")
    name VARCHAR(500) NOT NULL,
    description TEXT,

    -- External references
    client_reference VARCHAR(255),  -- Client's PO number
    external_project_id VARCHAR(255),  -- ID from source system (e.g., BeLazy)
    source_system VARCHAR(100),  -- e.g., "belazy", "manual", "api"

    -- Language settings
    source_language CHAR(5) NOT NULL,

    -- Service and workflow
    service_type service_type NOT NULL DEFAULT 'tep',

    -- Timeline
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deadline TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- Volume (aggregated from jobs, but cached here for performance)
    total_source_words INTEGER DEFAULT 0,
    total_weighted_words DECIMAL(12, 2) DEFAULT 0,

    -- Word count breakdown (from CAT analysis)
    word_count_breakdown JSONB DEFAULT '{}',

    -- Financial summary (cached, calculated from FinanceItems)
    estimated_revenue DECIMAL(15, 2) DEFAULT 0,
    actual_revenue DECIMAL(15, 2) DEFAULT 0,
    estimated_cost DECIMAL(15, 2) DEFAULT 0,
    actual_cost DECIMAL(15, 2) DEFAULT 0,
    currency_code CHAR(3) DEFAULT 'USD',

    -- Status
    status project_status NOT NULL DEFAULT 'draft',

    -- Metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_by UUID,  -- Reference to users table (not included in this schema)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_account ON project(account_id);
CREATE INDEX idx_project_status ON project(status);
CREATE INDEX idx_project_deadline ON project(deadline);
CREATE INDEX idx_project_external_id ON project(external_project_id);
CREATE INDEX idx_project_source_system ON project(source_system);

-- Sequence for project numbers
CREATE SEQUENCE project_number_seq START 1;

-- Function to generate project number
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.project_number IS NULL THEN
        NEW.project_number := 'PRJ-' ||
            TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
            LPAD(nextval('project_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_number
    BEFORE INSERT ON project
    FOR EACH ROW
    EXECUTE FUNCTION generate_project_number();

-- ============================================================================
-- JOB TABLE
-- ============================================================================

CREATE TABLE job (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,

    -- Core fields
    job_number VARCHAR(50) NOT NULL,  -- e.g., "PRJ-2024-00001-DE"
    name VARCHAR(500),

    -- Language (each job is typically one target language)
    target_language CHAR(5) NOT NULL,

    -- CRUCIAL: External vendor reference
    -- Stores the ID from external Vendor Management System (VMS)
    -- Must NOT store vendor names or addresses - only the external ID
    external_vendor_id VARCHAR(255),

    -- Service details
    service_type service_type NOT NULL DEFAULT 'tep',

    -- Volume
    source_words INTEGER DEFAULT 0,
    weighted_words DECIMAL(12, 2) DEFAULT 0,

    -- Word count breakdown for this job
    word_count_breakdown JSONB DEFAULT '{}',

    -- Timeline
    assigned_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- Rates (snapshot at time of assignment)
    rate_per_word DECIMAL(10, 4),
    rate_currency CHAR(3) DEFAULT 'USD',

    -- Calculated cost (weighted_words * rate_per_word)
    estimated_cost DECIMAL(15, 2) DEFAULT 0,
    actual_cost DECIMAL(15, 2) DEFAULT 0,

    -- Status
    status job_status NOT NULL DEFAULT 'pending',

    -- Quality metrics
    quality_score DECIMAL(5, 2),  -- 0-100

    -- Metadata
    instructions TEXT,
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT uq_job_number UNIQUE (project_id, job_number)
);

CREATE INDEX idx_job_project ON job(project_id);
CREATE INDEX idx_job_status ON job(status);
CREATE INDEX idx_job_external_vendor ON job(external_vendor_id);
CREATE INDEX idx_job_target_language ON job(target_language);
CREATE INDEX idx_job_deadline ON job(deadline);

-- ============================================================================
-- FINANCE ITEM (POLYMORPHIC: RECEIVABLE/PAYABLE)
-- ============================================================================

CREATE TABLE finance_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Polymorphic relationship via type discriminator + nullable FKs
    item_type finance_item_type NOT NULL,

    -- Link to Project (for Receivables - client owes us)
    project_id UUID REFERENCES project(id) ON DELETE CASCADE,

    -- Link to Job (for Payables - we owe vendor)
    job_id UUID REFERENCES job(id) ON DELETE CASCADE,

    -- Financial details
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 4) NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'USD',

    -- Calculated total (quantity * unit_price)
    total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    -- Tax handling
    tax_rate DECIMAL(5, 4) DEFAULT 0,
    tax_amount DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price * tax_rate) STORED,

    -- Status
    status finance_item_status NOT NULL DEFAULT 'draft',

    -- Invoice reference (when invoiced)
    invoice_number VARCHAR(100),
    invoice_date DATE,
    due_date DATE,
    paid_date DATE,

    -- For payables: external reference
    vendor_invoice_number VARCHAR(255),

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints: enforce polymorphic integrity
    CONSTRAINT chk_finance_item_link CHECK (
        (item_type = 'receivable' AND project_id IS NOT NULL AND job_id IS NULL)
        OR
        (item_type = 'payable' AND job_id IS NOT NULL)
        -- Note: payables can optionally have project_id for easier aggregation
    ),

    CONSTRAINT chk_finance_positive_values CHECK (
        quantity > 0 AND unit_price >= 0
    )
);

CREATE INDEX idx_finance_item_project ON finance_item(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_finance_item_job ON finance_item(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_finance_item_type ON finance_item(item_type);
CREATE INDEX idx_finance_item_status ON finance_item(status);
CREATE INDEX idx_finance_item_invoice ON finance_item(invoice_number);

-- ============================================================================
-- INGESTION FAILURE LOG (For BeLazy integration)
-- ============================================================================

CREATE TABLE ingestion_failure_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    source_system VARCHAR(100) NOT NULL,  -- e.g., 'belazy'

    -- Raw payload for debugging
    raw_payload JSONB NOT NULL,

    -- Error details
    error_message TEXT NOT NULL,
    error_stack TEXT,

    -- Resolution tracking
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_notes TEXT,

    -- If eventually successful, link to created project
    resulting_project_id UUID REFERENCES project(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ingestion_failure_unresolved ON ingestion_failure_log(is_resolved) WHERE NOT is_resolved;
CREATE INDEX idx_ingestion_failure_source ON ingestion_failure_log(source_system);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Project summary with aggregated job data
CREATE OR REPLACE VIEW project_summary AS
SELECT
    p.id,
    p.project_number,
    p.name,
    p.status,
    p.source_language,
    a.name AS account_name,
    a.id AS account_id,
    p.deadline,
    p.service_type,
    COUNT(j.id) AS job_count,
    COALESCE(SUM(j.source_words), 0) AS total_source_words,
    COALESCE(SUM(j.weighted_words), 0) AS total_weighted_words,
    ARRAY_AGG(DISTINCT j.target_language) FILTER (WHERE j.target_language IS NOT NULL) AS target_languages,
    p.estimated_revenue,
    p.estimated_cost,
    (p.estimated_revenue - p.estimated_cost) AS estimated_margin,
    CASE
        WHEN p.estimated_revenue > 0
        THEN ((p.estimated_revenue - p.estimated_cost) / p.estimated_revenue * 100)
        ELSE 0
    END AS margin_percentage,
    p.created_at
FROM project p
LEFT JOIN account a ON p.account_id = a.id
LEFT JOIN job j ON j.project_id = p.id
GROUP BY p.id, a.id;

-- View: Finance summary by project
CREATE OR REPLACE VIEW project_finance_summary AS
SELECT
    p.id AS project_id,
    p.project_number,
    p.account_id,
    COALESCE(SUM(fi.total_amount) FILTER (WHERE fi.item_type = 'receivable'), 0) AS total_receivables,
    COALESCE(SUM(fi.total_amount) FILTER (WHERE fi.item_type = 'payable'), 0) AS total_payables,
    COALESCE(SUM(fi.total_amount) FILTER (WHERE fi.item_type = 'receivable'), 0) -
    COALESCE(SUM(fi.total_amount) FILTER (WHERE fi.item_type = 'payable'), 0) AS gross_margin,
    COALESCE(SUM(fi.total_amount) FILTER (WHERE fi.item_type = 'receivable' AND fi.status = 'paid'), 0) AS paid_receivables,
    COALESCE(SUM(fi.total_amount) FILTER (WHERE fi.item_type = 'payable' AND fi.status = 'paid'), 0) AS paid_payables
FROM project p
LEFT JOIN finance_item fi ON fi.project_id = p.id OR fi.job_id IN (SELECT id FROM job WHERE project_id = p.id)
GROUP BY p.id;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_account_updated_at
    BEFORE UPDATE ON account
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_price_profile_updated_at
    BEFORE UPDATE ON price_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rate_card_updated_at
    BEFORE UPDATE ON rate_card
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_project_updated_at
    BEFORE UPDATE ON project
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_job_updated_at
    BEFORE UPDATE ON job
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_finance_item_updated_at
    BEFORE UPDATE ON finance_item
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Calculate weighted words from breakdown using price profile
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_weighted_words(
    p_word_breakdown JSONB,
    p_cat_grid JSONB
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    weighted_total DECIMAL(12, 2) := 0;
    breakdown_key TEXT;
    word_count INTEGER;
    grid_percentage DECIMAL(5, 4);
BEGIN
    -- Iterate through word breakdown
    FOR breakdown_key, word_count IN
        SELECT key, (value)::INTEGER
        FROM jsonb_each_text(p_word_breakdown)
    LOOP
        -- Get percentage from CAT grid (default to 1.0 if not found)
        grid_percentage := COALESCE(
            (p_cat_grid ->> breakdown_key)::DECIMAL,
            (p_cat_grid ->> 'no_match')::DECIMAL,
            1.0
        );

        weighted_total := weighted_total + (word_count * grid_percentage);
    END LOOP;

    RETURN weighted_total;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: Fuzzy account matching (for BeLazy integration)
-- ============================================================================

CREATE OR REPLACE FUNCTION find_matching_account(
    p_client_name VARCHAR(255),
    p_similarity_threshold DECIMAL DEFAULT 0.9
)
RETURNS TABLE (
    account_id UUID,
    account_name VARCHAR(255),
    match_type VARCHAR(20),
    similarity_score DECIMAL
) AS $$
BEGIN
    -- First try exact match
    RETURN QUERY
    SELECT a.id, a.name, 'exact'::VARCHAR(20), 1.0::DECIMAL
    FROM account a
    WHERE LOWER(a.name) = LOWER(p_client_name)
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Try fuzzy match using trigram similarity
    RETURN QUERY
    SELECT
        a.id,
        a.name,
        'fuzzy'::VARCHAR(20),
        similarity(LOWER(a.name), LOWER(p_client_name))::DECIMAL
    FROM account a
    WHERE similarity(LOWER(a.name), LOWER(p_client_name)) >= p_similarity_threshold
    ORDER BY similarity(LOWER(a.name), LOWER(p_client_name)) DESC
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Try Levenshtein distance for slight variations
    RETURN QUERY
    SELECT
        a.id,
        a.name,
        'levenshtein'::VARCHAR(20),
        (1.0 - (levenshtein(LOWER(a.name), LOWER(p_client_name))::DECIMAL /
               GREATEST(LENGTH(a.name), LENGTH(p_client_name))))::DECIMAL AS similarity
    FROM account a
    WHERE levenshtein(LOWER(a.name), LOWER(p_client_name)) <= 5
      AND (1.0 - (levenshtein(LOWER(a.name), LOWER(p_client_name))::DECIMAL /
                  GREATEST(LENGTH(a.name), LENGTH(p_client_name)))) >= p_similarity_threshold
    ORDER BY levenshtein(LOWER(a.name), LOWER(p_client_name))
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert default price profile
INSERT INTO price_profile (id, name, description, cat_grid, is_default) VALUES
(uuid_generate_v4(), 'Standard TEP', 'Default pricing grid for Translation, Editing, Proofreading',
 '{"100": 0.10, "context_match": 0.02, "repetitions": 0.10, "99-95": 0.25, "94-85": 0.50, "84-75": 0.75, "74-50": 1.0, "no_match": 1.0}',
 TRUE);

-- Insert MTPE price profile (higher weights for fuzzy matches)
INSERT INTO price_profile (id, name, description, cat_grid, is_default) VALUES
(uuid_generate_v4(), 'MTPE Light', 'Machine Translation Post-Editing - Light',
 '{"100": 0.05, "context_match": 0.01, "repetitions": 0.05, "99-95": 0.15, "94-85": 0.30, "84-75": 0.50, "74-50": 0.70, "no_match": 0.70}',
 FALSE);
