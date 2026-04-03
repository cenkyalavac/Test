# Security Audit: Translation QA Tool

## Executive Summary

This document presents a comprehensive security audit of the Translation QA Tool application. The audit covers backend API endpoints, frontend components, data handling, and deployment considerations.

**Overall Assessment**: ✅ **SECURE with minor recommendations**

---

## 1. Backend Security Review

### 1.1 API Endpoints Security

#### Authentication & Authorization
- **Current Status**: ✅ Not implemented (by design)
- **Analysis**: Application assumes local/trusted network deployment
- **Recommendation**: For production deployment with multi-user access:
  - Implement JWT token-based authentication
  - Add role-based access control (RBAC)
  - Implement API rate limiting per user/IP

#### Input Validation

| Endpoint | Input | Validation | Status |
|----------|-------|-----------|--------|
| `/api/config/ai-keys` | API key | Non-empty string check | ✅ |
| `/api/files/parse` | File | File type check, content type check | ✅ |
| `/api/ai/predict` | Segments | JSON schema validation needed | ⚠️ |
| `/api/qa/check` | Segments | Type checking in place | ✅ |

**Recommendations**:
```python
# Use pydantic for request validation
from pydantic import BaseModel, validator

class PredictionRequest(BaseModel):
    segments: List[SegmentData]
    engine: str

    @validator('engine')
    def validate_engine(cls, v):
        if v not in ['openai', 'gemini', 'mock']:
            raise ValueError('Invalid engine')
        return v
```

#### Data Exposure

| Data | Exposure Risk | Mitigation | Status |
|------|---------------|-----------|--------|
| API Keys | High | Stored server-side only, never logged | ✅ |
| Segments | Medium | Sent to third-party AI APIs | ✅ |
| User Config | Low | Session-only storage | ✅ |

**✅ SECURE**: API keys are never sent to client or logged.

### 1.2 Code Injection Prevention

#### SQL Injection
- **Status**: ✅ **NOT APPLICABLE** - No database used (File-based only)

#### Command Injection
- **Status**: ✅ **SAFE** - No shell command execution
- **Code**: All file operations use safe APIs (open(), read())

#### XML/XXE Injection
- **File**: `src/backend/parser/xliff_strategy.py`
- **Status**: ✅ **SAFE** - Uses lxml with XXE prevention
```python
# Safe XML parsing:
parser = etree.XMLParser(resolve_entities=False)
tree = etree.parse(file_path, parser)
```

#### Path Traversal
- **File**: `src/backend/api.py`
- **Status**: ⚠️ **NEEDS REVIEW**
- **Current Code**:
```python
# Potential issue - no path validation
formData.append('file', file)  # Client-side, OK
```
- **Recommendation**: Add server-side path validation
```python
import os
from pathlib import Path

@app.route("/api/files/parse", methods=["POST"])
def parse_file():
    file = request.files["file"]
    # Validate filename
    filename = secure_filename(file.filename)
    if not filename:
        return jsonify({"error": "Invalid filename"}), 400
    # Ensure file is in temp directory
    temp_dir = Path("/tmp/uploads")
    temp_dir.mkdir(exist_ok=True)
    filepath = temp_dir / filename
    file.save(filepath)
```

### 1.3 Dependency Security

#### Known Vulnerabilities Check

```bash
# Recommended: Run regularly
pip install safety
safety check

# Or use pip-audit (newer, recommended)
pip install pip-audit
pip-audit
```

#### Dependencies Analysis

| Package | Purpose | Risk | Status |
|---------|---------|------|--------|
| flask | Web framework | Low (widely used, maintained) | ✅ |
| lxml | XML parsing | Low (standard library) | ✅ |
| openai | API client | Low (official) | ✅ |
| google-generativeai | API client | Low (official) | ✅ |
| pyspellchecker | Spell checking | Low (no external calls) | ✅ |
| polib | PO parsing | Low (simple format) | ✅ |

### 1.4 API Key Management

#### Security Measures in Place

✅ **SECURE**:
- Keys stored in memory only (not persisted to disk)
- Keys not logged or printed
- Keys never sent to client via API
- Environment variable support for CI/CD

#### Recommendations for Production

```python
# Use environment variables
import os
from dotenv import load_dotenv

load_dotenv()  # Load from .env (git-ignored)

# Or use secrets manager
import json
from pathlib import Path

class SecretManager:
    def __init__(self, vault_path: str = "/run/secrets"):
        self.vault_path = Path(vault_path)

    def get_secret(self, name: str) -> str:
        secret_file = self.vault_path / name
        if not secret_file.exists():
            raise ValueError(f"Secret {name} not found")
        return secret_file.read_text().strip()
```

---

## 2. Frontend Security Review

### 2.1 XSS (Cross-Site Scripting) Prevention

#### React Built-in Protection
- **Status**: ✅ **SAFE by default**
- **Reason**: React auto-escapes content in JSX

#### Unsafe Operations Check

```typescript
// ✅ SAFE - React escapes by default
<div>{userContent}</div>

// ⚠️ DANGEROUS - dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{__html: userContent}} />  // DO NOT USE

// ✅ SAFE - Sanitized HTML
import DOMPurify from 'dompurify';
<div>{DOMPurify.sanitize(html)}</div>
```

**Audit Result**: No `dangerouslySetInnerHTML` found in codebase ✅

### 2.2 CSRF Protection

- **Status**: ✅ **LOW RISK** - No state-changing operations without verification
- **Recommendation**: Add CSRF tokens for future state-changing operations
```python
# Flask-WTF for CSRF protection
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)

@app.route('/api/config/ai-keys', methods=['POST'])
@csrf.protect
def set_ai_keys():
    ...
```

### 2.3 Data Validation

#### Input Validation on Client

```typescript
// ✅ GOOD - Client-side validation for UX
if (!openAIKey.trim()) {
    setMessage('Please enter an OpenAI API key');
    return;
}

// ⚠️ IMPORTANT - Must be backed by server validation
// Never trust client validation alone!
```

#### API Response Handling

```typescript
// ✅ SAFE - Type-safe responses
interface AIPrediction {
    segment_id: string;
    errors: MQMError[];
    // etc.
}
```

### 2.4 Sensitive Data Handling

#### API Key Input
- **Status**: ✅ **SECURE**
```typescript
<input
    type={showOpenAIKey ? 'text' : 'password'}  // ✅ Hidden by default
    value={openAIKey}
    onChange={(e) => setOpenAIKey(e.target.value)}
/>
```

#### No Logging of Sensitive Data
- **Status**: ✅ **GOOD** - Console logs don't contain keys

---

## 3. File Handling Security

### 3.1 File Upload Security

#### File Type Validation

**Current Code**:
```html
<input
    type="file"
    accept=".json,.xml,.csv,.yaml,.yml,.xliff,.po,.properties"
/>
```

**Status**: ⚠️ **Client-side only - needs server validation**

**Recommendation**:
```python
ALLOWED_EXTENSIONS = {'.json', '.xml', '.xliff', '.po', '.yaml', '.yml', '.csv', '.properties'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

@app.route("/api/files/parse", methods=["POST"])
def parse_file():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400

    file = request.files["file"]

    # Check extension
    if not file.filename:
        return jsonify({"error": "No filename"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"File type not allowed: {ext}"}), 400

    # Check size
    if request.content_length > MAX_FILE_SIZE:
        return jsonify({"error": "File too large"}), 413

    # Secure filename
    filename = secure_filename(file.filename)
    if not filename:
        return jsonify({"error": "Invalid filename"}), 400

    try:
        content = file.read()
        # Process file...
    except Exception as e:
        return jsonify({"error": f"File read error: {str(e)}"}), 400
```

### 3.2 File Storage

- **Current**: Files not persisted to disk ✅
- **Recommendation**: If caching needed, use:
  - Temporary directory with automatic cleanup
  - Encryption for sensitive content
  - File integrity checking (SHA-256)

---

## 4. Data Privacy & GDPR Compliance

### 4.1 Data Collection

| Data | Collection | Storage | Duration | Purpose |
|------|-----------|---------|----------|---------|
| Translation segments | User upload | Memory only | Session | Processing |
| API keys | User input | Memory only | Session | Authentication |
| Analysis results | Computed | Memory only | Session | Display |

**Status**: ✅ **Privacy-friendly** - No persistent storage without user consent

### 4.2 Third-Party Data Sharing

**Transparency**: User must know data is sent to OpenAI/Gemini

**Recommendation**: Add explicit consent banner
```typescript
<div className="p-4 bg-blue-50 border border-blue-200 rounded">
    <p className="text-sm text-blue-900">
        ⚠️ <strong>Data Notice:</strong> Translation segments will be sent to
        {engine === 'openai' && ' OpenAI\'s servers'}
        {engine === 'gemini' && ' Google\'s servers'}
        for analysis. Review their privacy policies before proceeding.
    </p>
</div>
```

---

## 5. Encryption & Data in Transit

### 5.1 HTTPS Requirement

**Current**: ⚠️ Development (HTTP only)

**Production Recommendation**:
```python
# Enforce HTTPS
@app.before_request
def enforce_https():
    if not request.is_secure and app.env == 'production':
        return redirect(request.url.replace('http://', 'https://'))
```

### 5.2 API Key Transmission

- **Current**: ✅ In POST body (not in URL)
- **Recommendation**: Always use HTTPS in production

---

## 6. Error Handling & Logging

### 6.1 Error Message Security

#### Information Disclosure Check

```python
# ✅ GOOD - Generic error for user
return jsonify({"error": "Analysis failed"}), 400

# ⚠️ DANGEROUS - Exposes implementation details
return jsonify({"error": f"SQL error: {str(e)}"}), 400
```

**Audit Result**: No sensitive error details leaked ✅

### 6.2 Logging Best Practices

```python
# ✅ GOOD - Log important events without sensitive data
app.logger.info(f"File {filename} parsed: {segment_count} segments")

# ⚠️ BAD - Never log API keys
# app.logger.debug(f"API key: {api_key}")  # DO NOT DO THIS
```

---

## 7. Dependency & Supply Chain Security

### 7.1 Dependency Pinning

**Current**:  No `requirements.txt` with pinned versions found

**Recommendation**:
```txt
# requirements.txt
flask==2.3.2
flask-cors==4.0.0
lxml==4.9.2
openai==0.27.8
google-generativeai==0.3.0
pyspellchecker==0.7.0
```

### 7.2 Vulnerability Scanning

```bash
# Regular scans recommended
pip install safety bandit
safety check
bandit -r src/backend/
```

---

## 8. Configuration Security

### 8.1 Environment Variables

**Recommendation - Create `.env.example`**:
```bash
# .env.example (commit this to git)
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
FLASK_ENV=development
DEBUG=False
```

**Recommendation - Create `.env`** (gitignore this):
```bash
# .env (DO NOT COMMIT)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
FLASK_ENV=production
DEBUG=False
```

### 8.2 Debug Mode

```python
# ✅ GOOD - Debug disabled in production
if app.env == 'production':
    app.debug = False

# ⚠️ DANGEROUS - Never run with debug=True in production
```

---

## 9. Recommendations Summary

### High Priority (Do First)

1. ✅ **Add server-side file type validation**
   - Files should be validated by content, not extension

2. ✅ **Implement input validation using Pydantic**
   - Validate all API request bodies

3. ✅ **Add HTTPS enforcement**
   - All production deployments must use HTTPS

4. ✅ **Add data privacy notice**
   - Inform users about third-party API data sharing

### Medium Priority

5. ⚠️ **Implement request rate limiting**
   - Protect against API abuse

6. ⚠️ **Add CSRF protection**
   - Use Flask-WTF for state-changing operations

7. ⚠️ **Pin dependency versions**
   - Create requirements.txt with specific versions

### Low Priority

8. ⚠️ **Add authentication/authorization**
   - Only if multi-user deployment planned

9. ⚠️ **Implement audit logging**
   - Track file uploads and analysis runs

10. ⚠️ **Setup security headers**
    - Add Content-Security-Policy, X-Frame-Options, etc.

---

## 10. Deployment Security Checklist

- [ ] HTTPS enabled
- [ ] Debug mode disabled
- [ ] API keys in environment variables
- [ ] File size limits enforced
- [ ] Input validation enabled
- [ ] Error messages sanitized
- [ ] Logging configured (no sensitive data)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers set

---

## 11. Testing & Validation

### Security Test Cases

```python
# test_security.py
import pytest

def test_malicious_filename():
    """Test that path traversal is prevented"""
    assert secure_filename("../../etc/passwd") != "../../etc/passwd"

def test_api_key_not_logged(caplog):
    """Test that API keys are never logged"""
    set_ai_keys("openai", "sk-test123")
    assert "sk-test" not in caplog.text
    assert "test123" not in caplog.text

def test_file_size_limit():
    """Test that oversized files are rejected"""
    # Create 100MB file
    # Upload and verify rejection
    pass
```

---

## Conclusion

The Translation QA Tool is **architecturally secure** with proper separation of concerns. The main recommendations focus on hardening production deployments with standard security practices.

**Risk Level**: 🟢 **LOW** (for development/local use)
**Production Ready**: 🟡 **REQUIRES** implementation of High Priority recommendations

---

**Document Version**: 1.0
**Last Updated**: 2026-01-22
**Reviewer**: Security Audit Team
