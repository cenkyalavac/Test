"""
Flask API for Translation QA Tool

Provides REST endpoints for file parsing, QA checking, and AI predictions.
Security features: Input validation, file type checking, secure filename handling.
"""

from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
import json
import os
import io
from typing import List, Dict, Any, Optional

from src.backend.parser.parser_factory import ParserFactory
from src.backend.parser.models import Segment
from src.backend.parser.package_extractor import PackageExtractor, PackageExtractorError
from src.backend.qa import (
    AdvancedQAChecker, AIPredictionConfig, AIEngine,
    PredictorFactory, MockAIPredictor, ChecklistParser
)

# Security Configuration
ALLOWED_FILE_EXTENSIONS = {
    # Standard translation formats
    '.json', '.xml', '.xliff', '.xlf', '.po', '.yaml', '.yml', '.csv', '.properties',
    # XLIFF variants
    '.sdlxliff', '.mqxliff', '.mxliff',
    # Translation package formats
    '.xlz', '.wsxz', '.sdlppx', '.sdlrpx', '.mqout', '.zip'
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_SEGMENTS = 10000  # Maximum segments to process

# Path to dist folder (frontend build) - Use absolute paths for reliability
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))  # src/backend -> src -> root
DIST_FOLDER = os.path.join(ROOT_DIR, 'dist')


# Flask app configuration
app = Flask(
    __name__,
    static_folder=os.path.join(DIST_FOLDER, 'assets'),
    static_url_path='/assets',
    template_folder=DIST_FOLDER
)

# CORS configuration (supports both single-service and dual-service deployments)
# Single service: same origin (no CORS issues)
# Dual service on Railway: allows cross-origin requests from frontend service
CORS(app,
     resources={r"/api/*": {
         "origins": "*",
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "expose_headers": ["Content-Type"],
     }}
)

# Security headers
@app.after_request
def set_security_headers(response):
    """Add security headers to responses."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# Global state for API keys and configuration
api_config = {
    "openai_key": None,
    "gemini_key": None,
    "default_engine": "mock",  # 'openai', 'gemini', or 'mock'
}

# Cache for parsed segments
segments_cache: Dict[str, List[Segment]] = {}


# ============================================================================
# Security & Validation Helper Functions
# ============================================================================

def validate_filename(filename: str) -> bool:
    """Validate filename for security."""
    if not filename:
        return False

    # Check extension
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        return False

    # Check for null bytes and suspicious patterns
    if '\x00' in filename or '..' in filename:
        return False

    return True


def validate_file(file) -> tuple[bool, str]:
    """
    Validate uploaded file.

    Returns:
        tuple: (is_valid, error_message)
    """
    if not file or not file.filename:
        return False, "No file provided"

    if not validate_filename(file.filename):
        ext = os.path.splitext(file.filename)[1].lower()
        return False, f"File type not allowed: {ext}. Allowed: {', '.join(ALLOWED_FILE_EXTENSIONS)}"

    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_FILE_SIZE:
        return False, f"File too large. Maximum: {MAX_FILE_SIZE // 1024 // 1024}MB"

    if file_size == 0:
        return False, "File is empty"

    return True, ""


def validate_segments(segments: List[Dict]) -> tuple[bool, str]:
    """
    Validate segment data.

    Returns:
        tuple: (is_valid, error_message)
    """
    if not segments:
        return False, "No segments provided"

    if len(segments) > MAX_SEGMENTS:
        return False, f"Too many segments. Maximum: {MAX_SEGMENTS}"

    for seg in segments:
        if not isinstance(seg, dict):
            return False, "Invalid segment format"

        required_fields = ['segment_id', 'source_text', 'target_text', 'status']
        for field in required_fields:
            if field not in seg:
                return False, f"Missing required field: {field}"

    return True, ""


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "Translation QA Tool API"
    }), 200


# ============================================================================
# API Keys and Configuration Endpoints
# ============================================================================

@app.route("/api/config/ai-keys", methods=["POST"])
def set_ai_keys():
    """
    Set API keys for AI engines.

    Request body:
    {
        "engine": "openai" | "gemini",
        "api_key": "sk-..."
    }
    """
    data = request.get_json()
    engine = data.get("engine", "").lower()
    api_key = data.get("api_key", "").strip()

    if not engine or not api_key:
        return jsonify({"error": "engine and api_key required"}), 400

    if engine == "openai":
        api_config["openai_key"] = api_key
        return jsonify({"status": "OpenAI key set"}), 200
    elif engine == "gemini":
        api_config["gemini_key"] = api_key
        return jsonify({"status": "Gemini key set"}), 200
    else:
        return jsonify({"error": f"Unknown engine: {engine}"}), 400


@app.route("/api/config/default-engine", methods=["POST"])
def set_default_engine():
    """
    Set the default AI engine.

    Request body:
    {
        "engine": "openai" | "gemini" | "mock"
    }
    """
    data = request.get_json()
    engine = data.get("engine", "").lower()

    if engine not in ["openai", "gemini", "mock"]:
        return jsonify({"error": "engine must be: openai, gemini, or mock"}), 400

    api_config["default_engine"] = engine
    return jsonify({"status": f"Default engine set to {engine}"}), 200


@app.route("/api/config/engines", methods=["GET"])
def get_configured_engines():
    """Get list of configured AI engines."""
    engines = []

    if api_config["openai_key"]:
        engines.append({
            "engine": "openai",
            "configured": True,
            "key_preview": f"sk-{api_config['openai_key'][-4:]}"
        })

    if api_config["gemini_key"]:
        engines.append({
            "engine": "gemini",
            "configured": True,
            "key_preview": f"...{api_config['gemini_key'][-4:]}"
        })

    engines.append({
        "engine": "mock",
        "configured": True,
        "key_preview": "N/A (for testing)"
    })

    return jsonify({
        "configured_engines": engines,
        "default_engine": api_config["default_engine"]
    }), 200


# ============================================================================
# File Upload and Parsing Endpoints
# ============================================================================

@app.route("/api/files/parse", methods=["POST"])
def parse_file():
    """
    Parse a translation file or package.

    Supports:
    - Standard formats: XLIFF, PO, JSON, etc.
    - Package formats: .xlz (Lionbridge), .wsxz (Trados), .sdlppx/.sdlrpx (Trados Project), .mqout (MemoQ)

    Security: Validates file type, size, and content.
    Returns list of segments merged from all files in package (if applicable).
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    try:
        # Read file content
        file_content = file.read()
        file.seek(0)

        # Secure filename for caching
        secure_name = secure_filename(file.filename)
        if not secure_name:
            secure_name = f"file_{id(file)}"

        # Check if it's a package file
        file_ext = os.path.splitext(file.filename)[1].lower()
        is_package = PackageExtractor.is_package_file(file.filename)

        if is_package:
            # Extract files from package
            extractor = PackageExtractor()
            file_stream = io.BytesIO(file_content)

            try:
                extracted_files, metadata = extractor.extract_translation_files(
                    file_stream, file.filename
                )
            except PackageExtractorError as e:
                return jsonify({"error": str(e)}), 400

            # Parse each extracted file
            all_segments = []
            file_info_list = []
            parse_errors = []

            for filename, content in extracted_files.items():
                try:
                    parser = ParserFactory.create(filename)
                    # Content is bytes from ZIP, decode to string for parsing
                    content_str = content.decode('utf-8', errors='replace')
                    segments = parser.parse_string(content_str, filename)

                    # Add source file info to segments
                    for seg in segments:
                        seg.metadata.custom_attributes['_package_file'] = filename
                        seg.metadata.custom_attributes['_package_format'] = metadata[filename].get('format', 'Unknown')

                    all_segments.extend(segments)
                    file_info_list.append({
                        'filename': filename,
                        'segment_count': len(segments),
                        'format': metadata[filename].get('format'),
                        'language': metadata[filename].get('language'),
                    })

                except Exception as e:
                    error_msg = f"{type(e).__name__}: {str(e)}"
                    app.logger.error(f"Failed to parse {filename} from package: {error_msg}")
                    parse_errors.append({'filename': filename, 'error': error_msg})
                    continue

            # Limit segments
            if len(all_segments) > MAX_SEGMENTS:
                return jsonify({
                    "error": f"Package contains too many segments ({len(all_segments)}). Maximum: {MAX_SEGMENTS}"
                }), 413

            # Check if we got any segments at all
            if len(all_segments) == 0:
                error_details = '\n'.join([f"- {e['filename']}: {e['error']}" for e in parse_errors])
                return jsonify({
                    "error": f"No segments could be extracted from package. Parsing errors:\n{error_details}"
                }), 400

            # Cache segments
            segments_cache[secure_name] = all_segments

            # Convert to JSON-serializable format
            segments_data = [seg.to_dict() for seg in all_segments]

            response_data = {
                "file_id": secure_name,
                "filename": file.filename,
                "is_package": True,
                "package_format": file_ext,
                "files_extracted": len(extracted_files),
                "extracted_files": file_info_list,
                "segment_count": len(all_segments),
                "segments": segments_data
            }

            # Include parse errors as warning if any files failed
            if parse_errors:
                response_data["warnings"] = {
                    "parse_errors": parse_errors,
                    "message": f"{len(parse_errors)} file(s) failed to parse but {len(all_segments)} segments were successfully extracted"
                }

            return jsonify(response_data), 200

        else:
            # Standard file parsing (non-package)
            parser = ParserFactory.create(file.filename)
            # File content is bytes, decode to string for parsing
            content_str = file_content.decode('utf-8', errors='replace')
            segments = parser.parse_string(content_str, file.filename)

            # Limit segments
            if len(segments) > MAX_SEGMENTS:
                return jsonify({
                    "error": f"File contains too many segments ({len(segments)}). Maximum: {MAX_SEGMENTS}"
                }), 413

            # Cache segments
            segments_cache[secure_name] = segments

            # Convert to JSON-serializable format
            segments_data = [seg.to_dict() for seg in segments]

            return jsonify({
                "file_id": secure_name,
                "filename": file.filename,
                "is_package": False,
                "segment_count": len(segments),
                "segments": segments_data
            }), 200

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        app.logger.error(f"File parsing error: {error_msg}")
        return jsonify({"error": f"Failed to parse file: {error_msg}"}), 400


# ============================================================================
# QA Checking Endpoints
# ============================================================================

@app.route("/api/qa/check", methods=["POST"])
def run_qa_check():
    """
    Run advanced QA checks on segments.

    Security: Validates input data.

    Request body:
    {
        "segments": [
            {
                "segment_id": "1",
                "source_text": "Save",
                "target_text": "Kaydet",
                "status": "translated",
                "source_language": "en",
                "target_language": "tr"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    segments_data = data.get("segments", [])

    # Validate segments
    is_valid, error_msg = validate_segments(segments_data)
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    try:
        # Reconstruct segments
        from src.backend.parser.models import SegmentStatus

        segments = []
        for seg_data in segments_data:
            try:
                status = SegmentStatus(seg_data.get("status", "unknown"))
            except ValueError:
                status = SegmentStatus.UNKNOWN

            segment = Segment(
                segment_id=seg_data.get("segment_id", ""),
                source_text=seg_data.get("source_text", ""),
                target_text=seg_data.get("target_text", ""),
                status=status,
                source_language=seg_data.get("source_language"),
                target_language=seg_data.get("target_language"),
            )
            segments.append(segment)

        # Run QA checks
        checker = AdvancedQAChecker()
        issues = checker.check_segments(segments)

        # Convert issues to JSON
        issues_data = []
        for issue in issues:
            issues_data.append({
                "segment_id": issue.segment_id,
                "check_type": issue.check_type.value,
                "severity": issue.severity,
                "message": issue.message,
                "source_text": issue.source_text,
                "target_text": issue.target_text,
                "details": issue.details
            })

        summary = checker.get_summary()

        return jsonify({
            "total_issues": len(issues),
            "issues": issues_data,
            "summary": summary
        }), 200

    except Exception as e:
        return jsonify({"error": f"QA check failed: {str(e)}"}), 400


# ============================================================================
# AI Prediction Endpoints
# ============================================================================

@app.route("/api/ai/predict", methods=["POST"])
def predict_errors():
    """
    Use AI to predict translation errors with MQM classification.

    Security: Validates input and engine parameter.

    Request body:
    {
        "segments": [...],
        "engine": "openai" | "gemini" | "mock" (optional, uses default if not specified)
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    segments_data = data.get("segments", [])
    engine = data.get("engine", api_config["default_engine"]).lower()

    # Validate segments
    is_valid, error_msg = validate_segments(segments_data)
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    # Validate engine
    if engine not in ["openai", "gemini", "mock"]:
        return jsonify({"error": f"Unknown engine: {engine}. Must be: openai, gemini, mock"}), 400

    try:
        # Reconstruct segments
        from src.backend.parser.models import SegmentStatus

        segments = []
        for seg_data in segments_data:
            try:
                status = SegmentStatus(seg_data.get("status", "unknown"))
            except ValueError:
                status = SegmentStatus.UNKNOWN

            segment = Segment(
                segment_id=seg_data.get("segment_id", ""),
                source_text=seg_data.get("source_text", ""),
                target_text=seg_data.get("target_text", ""),
                status=status,
                source_language=seg_data.get("source_language"),
                target_language=seg_data.get("target_language"),
            )
            segments.append(segment)

        # Create predictor based on engine
        if engine == "openai":
            if not api_config["openai_key"]:
                return jsonify({"error": "OpenAI API key not configured"}), 400
            config = AIPredictionConfig(
                engine=AIEngine.OPENAI,
                api_key=api_config["openai_key"]
            )
        elif engine == "gemini":
            if not api_config["gemini_key"]:
                return jsonify({"error": "Gemini API key not configured"}), 400
            config = AIPredictionConfig(
                engine=AIEngine.GEMINI,
                api_key=api_config["gemini_key"]
            )
        elif engine == "mock":
            config = AIPredictionConfig(
                engine=AIEngine.OPENAI,  # Engine doesn't matter for mock
                api_key="mock-key"
            )
            predictor = MockAIPredictor(config)
        else:
            return jsonify({"error": f"Unknown engine: {engine}"}), 400

        # Get predictor (or use mock)
        if engine != "mock":
            predictor = PredictorFactory.create_predictor(config)

        # Generate predictions
        predictions = predictor.predict(segments)

        # Convert to JSON
        predictions_data = []
        for pred in predictions:
            errors_data = []
            for error in pred.errors:
                errors_data.append({
                    "error_type": error.error_type.value,
                    "category": error.category.value,
                    "severity": error.severity.value,
                    "message": error.message,
                    "explanation": error.explanation,
                    "suggestion": error.suggestion
                })

            predictions_data.append({
                "segment_id": pred.segment_id,
                "source_text": pred.source_text,
                "target_text": pred.target_text,
                "errors": errors_data,
                "overall_comment": pred.overall_comment,
                "confidence": pred.confidence_score,
                "stats": pred.summary_stats()
            })

        return jsonify({
            "engine": engine,
            "predictions": predictions_data,
            "total_predictions": len(predictions)
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 400


@app.route("/api/ai/predict-batch", methods=["POST"])
def predict_batch():
    """
    Batch predict errors with optional checklist loading.

    Request body:
    {
        "segments": [...],
        "engine": "openai" | "gemini" | "mock",
        "checklist_file": (optional) base64 encoded checklist XML
    }
    """
    data = request.get_json()
    segments_data = data.get("segments", [])
    engine = data.get("engine", api_config["default_engine"]).lower()
    checklist_content = data.get("checklist_file")

    if not segments_data:
        return jsonify({"error": "No segments provided"}), 400

    try:
        from src.backend.parser.models import SegmentStatus
        import base64

        # Reconstruct segments
        segments = []
        for seg_data in segments_data:
            try:
                status = SegmentStatus(seg_data.get("status", "unknown"))
            except ValueError:
                status = SegmentStatus.UNKNOWN

            segment = Segment(
                segment_id=seg_data.get("segment_id", ""),
                source_text=seg_data.get("source_text", ""),
                target_text=seg_data.get("target_text", ""),
                status=status,
                source_language=seg_data.get("source_language"),
                target_language=seg_data.get("target_language"),
            )
            segments.append(segment)

        # Create predictor
        if engine == "openai":
            if not api_config["openai_key"]:
                return jsonify({"error": "OpenAI API key not configured"}), 400
            config = AIPredictionConfig(
                engine=AIEngine.OPENAI,
                api_key=api_config["openai_key"]
            )
        elif engine == "gemini":
            if not api_config["gemini_key"]:
                return jsonify({"error": "Gemini API key not configured"}), 400
            config = AIPredictionConfig(
                engine=AIEngine.GEMINI,
                api_key=api_config["gemini_key"]
            )
        elif engine == "mock":
            config = AIPredictionConfig(
                engine=AIEngine.OPENAI,
                api_key="mock-key"
            )
            predictor = MockAIPredictor(config)
        else:
            return jsonify({"error": f"Unknown engine: {engine}"}), 400

        if engine != "mock":
            predictor = PredictorFactory.create_predictor(config)

        # Generate predictions
        predictions = predictor.predict(segments)

        # Load checklist if provided
        if checklist_content:
            try:
                checklist_bytes = base64.b64decode(checklist_content)
                parser = ChecklistParser()
                checklist = parser.parse_string(checklist_bytes)

                # Create QA checker and load checklist
                qa_checker = AdvancedQAChecker()
                qa_checker.load_checklist(checklist)

                # Run QA checks
                qa_issues = qa_checker.check_segments(segments)
            except Exception as e:
                qa_issues = []
                print(f"Checklist processing error: {e}")
        else:
            qa_issues = []

        # Convert to JSON
        predictions_data = []
        for pred in predictions:
            errors_data = []
            for error in pred.errors:
                errors_data.append({
                    "error_type": error.error_type.value,
                    "category": error.category.value,
                    "severity": error.severity.value,
                    "message": error.message,
                    "explanation": error.explanation,
                    "suggestion": error.suggestion
                })

            predictions_data.append({
                "segment_id": pred.segment_id,
                "source_text": pred.source_text,
                "target_text": pred.target_text,
                "errors": errors_data,
                "overall_comment": pred.overall_comment,
                "confidence": pred.confidence_score,
                "stats": pred.summary_stats()
            })

        # Convert QA issues to JSON
        qa_issues_data = []
        for issue in qa_issues:
            qa_issues_data.append({
                "segment_id": issue.segment_id,
                "check_type": issue.check_type.value,
                "severity": issue.severity,
                "message": issue.message,
            })

        return jsonify({
            "engine": engine,
            "ai_predictions": predictions_data,
            "qa_issues": qa_issues_data,
            "total_predictions": len(predictions),
            "total_qa_issues": len(qa_issues)
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Batch prediction failed: {str(e)}"}), 400


# ============================================================================
# Checklist Endpoints
# ============================================================================

@app.route("/api/checklists/parse", methods=["POST"])
def parse_checklist():
    """
    Parse an XBench checklist file.

    Expects file upload with checklist XML.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No filename"}), 400

    try:
        content = file.read()
        parser = ChecklistParser()
        checklist = parser.parse_string(content)

        return jsonify({
            "name": checklist.name,
            "description": checklist.description,
            "total_rules": len(checklist.rules),
            "active_rules": sum(1 for r in checklist.rules if r.enabled),
            "rules": [
                {
                    "id": rule.id,
                    "message": rule.message,
                    "enabled": rule.enabled,
                    "check_type": rule.check_type.value if rule.check_type else None,
                }
                for rule in checklist.rules
            ]
        }), 200

    except Exception as e:
        return jsonify({"error": f"Checklist parsing failed: {str(e)}"}), 400


# ============================================================================
# Frontend Routes (SPA Support)
# ============================================================================

# Serve static assets from dist/assets directory
@app.route('/assets/<path:filepath>')
def serve_assets(filepath):
    """Serve frontend static assets."""
    try:
        return send_from_directory(os.path.join(DIST_FOLDER, 'assets'), filepath)
    except Exception as e:
        return jsonify({"error": "Asset not found"}), 404


# Serve root index.html
@app.route('/')
def serve_root():
    """Serve the React SPA root."""
    try:
        return send_from_directory(DIST_FOLDER, 'index.html')
    except Exception as e:
        return jsonify({"error": "Frontend files not found. Run 'npm run build' first."}), 500


# Error handler for 404 - serve index.html for SPA routing
@app.errorhandler(404)
def serve_spa_fallback(error):
    """
    Serve index.html for all non-API routes.
    This enables client-side routing in the React SPA.

    Important: This is only called for routes that don't match any Flask route.
    API routes are matched before this handler is called, so they won't be affected.
    """
    # Log the 404 for debugging
    path = request.path
    print(f"[SPA Fallback] 404 for path: {path}")

    # If this somehow matches an API route, don't serve the frontend
    # (This should never happen if routing is correct)
    if path.startswith('/api/'):
        return jsonify({"error": "API endpoint not found"}), 404

    # Serve index.html for all other routes (client-side SPA routing)
    try:
        return send_from_directory(DIST_FOLDER, 'index.html')
    except Exception as e:
        print(f"[Error] Failed to serve index.html: {e}")
        return jsonify({"error": "Frontend files not found. Run 'npm run build' first."}), 500


if __name__ == "__main__":
    # Use PORT environment variable set by Railway, default to 8000 for local development
    port = int(os.environ.get('PORT', 8000))
    # Disable debug mode in production (Railway)
    debug = os.environ.get('ENVIRONMENT', 'development') == 'development'
    app.run(debug=debug, port=port, host='0.0.0.0')
