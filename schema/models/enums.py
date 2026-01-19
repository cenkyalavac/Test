"""
Enum Definitions for TBMS

All PostgreSQL ENUMs used across the schema.
"""

import enum


class AccountType(str, enum.Enum):
    """Classification of account types."""

    DIRECT_CLIENT = "direct_client"  # End client with direct relationship
    AGENCY = "agency"  # Translation agency/LSP
    ENTERPRISE = "enterprise"  # Large enterprise with multiple subsidiaries
    SUBSIDIARY = "subsidiary"  # Child account of an enterprise
    PROSPECT = "prospect"  # Unverified/potential client
    VENDOR = "vendor"  # External vendor (for payables tracking)


class AccountStatus(str, enum.Enum):
    """Account lifecycle status."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    UNVERIFIED = "unverified"
    PENDING_SETUP = "pending_setup"


class ProjectStatus(str, enum.Enum):
    """Project workflow status."""

    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    IN_PROGRESS = "in_progress"
    DELIVERED = "delivered"
    INVOICED = "invoiced"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class JobStatus(str, enum.Enum):
    """Job/task workflow status."""

    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DELIVERED = "delivered"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class FinanceItemType(str, enum.Enum):
    """
    Polymorphic discriminator for finance items.

    RECEIVABLE: Linked to Project (client owes us)
    PAYABLE: Linked to Job (we owe vendor)
    """

    RECEIVABLE = "receivable"
    PAYABLE = "payable"


class FinanceItemStatus(str, enum.Enum):
    """Finance item lifecycle status."""

    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    INVOICED = "invoiced"
    PAID = "paid"
    DISPUTED = "disputed"
    WRITTEN_OFF = "written_off"


class ServiceType(str, enum.Enum):
    """Types of translation/localization services."""

    TRANSLATION_ONLY = "translation_only"
    TEP = "tep"  # Translation, Editing, Proofreading
    MTPE = "mtpe"  # Machine Translation Post-Editing
    REVIEW_ONLY = "review_only"
    TRANSCREATION = "transcreation"
    LOCALIZATION = "localization"
    DTP = "dtp"  # Desktop Publishing
    SUBTITLING = "subtitling"
    INTERPRETATION = "interpretation"
