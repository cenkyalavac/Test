"""
Flask API for Translation QA Tool

Provides REST endpoints for file parsing, QA checking, and AI predictions.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from typing import List, Dict, Any, Optional

from src.backend.parser.parser_factory import ParserFactory
from src.backend.parser.models import Segment
from src.backend.qa import (
    AdvancedQAChecker, AIPredictionConfig, AIEngine,
    PredictorFactory, MockAIPredictor, ChecklistParser
)

app = Flask(__name__)
CORS(app)

# Global state for API keys and configuration
api_config = {
    "openai_key": None,
    "gemini_key": None,
    "default_engine": "mock",  # 'openai', 'gemini', or 'mock'
}

# Cache for parsed segments
segments_cache: Dict[str, List[Segment]] = {}


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
    Parse a translation file (XLIFF, PO, JSON).

    Returns list of segments.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No filename"}), 400

    try:
        # Read file content
        content = file.read()

        # Auto-detect and parse
        factory = ParserFactory()
        parser = factory.create_parser_for_file(file.filename, content)
        segments = parser.parse()

        # Cache segments for later use
        file_id = file.filename
        segments_cache[file_id] = segments

        # Convert segments to JSON-serializable format
        segments_data = [seg.to_dict() for seg in segments]

        return jsonify({
            "file_id": file_id,
            "filename": file.filename,
            "segment_count": len(segments),
            "segments": segments_data
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 400


# ============================================================================
# QA Checking Endpoints
# ============================================================================

@app.route("/api/qa/check", methods=["POST"])
def run_qa_check():
    """
    Run advanced QA checks on segments.

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
    data = request.get_json()
    segments_data = data.get("segments", [])

    if not segments_data:
        return jsonify({"error": "No segments provided"}), 400

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

    Request body:
    {
        "segments": [...],
        "engine": "openai" | "gemini" | "mock" (optional, uses default if not specified)
    }
    """
    data = request.get_json()
    segments_data = data.get("segments", [])
    engine = data.get("engine", api_config["default_engine"]).lower()

    if not segments_data:
        return jsonify({"error": "No segments provided"}), 400

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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
