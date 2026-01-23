"""
Request validation schemas using Pydantic.

Provides type-safe validation for all API requests.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Literal, Optional, Dict, Any
from enum import Enum


class QAMode(str, Enum):
    """QA check modes."""
    FAST = "fast"
    BALANCED = "balanced"
    FULL = "full"


class SegmentRequest(BaseModel):
    """Segment data for QA/prediction."""
    segment_id: str = Field(..., min_length=1, description="Unique segment identifier")
    source_text: str = Field(..., description="Source text")
    target_text: str = Field(..., description="Target text")
    status: str = Field(..., description="Segment status")
    source_language: Optional[str] = Field(None, description="Source language code")
    target_language: Optional[str] = Field(None, description="Target language code")

    class Config:
        """Pydantic config."""
        str_strip_whitespace = True


class QACheckRequest(BaseModel):
    """QA check request validation."""
    segments: List[SegmentRequest] = Field(..., min_items=1, max_items=10000, description="Segments to check")
    mode: QAMode = Field(default=QAMode.BALANCED, description="QA check mode")

    @validator('segments')
    def validate_non_empty_segments(cls, segments: List[SegmentRequest]) -> List[SegmentRequest]:
        """Ensure segments are not empty."""
        if not segments:
            raise ValueError("At least one segment required")
        return segments


class AIPredictionRequest(BaseModel):
    """AI prediction request validation."""
    segments: List[SegmentRequest] = Field(..., min_items=1, max_items=10000, description="Segments to analyze")
    engine: Literal["openai", "gemini", "mock"] = Field(default="mock", description="AI engine to use")

    @validator('segments')
    def validate_non_empty_segments(cls, segments: List[SegmentRequest]) -> List[SegmentRequest]:
        """Ensure segments are not empty."""
        if not segments:
            raise ValueError("At least one segment required")
        return segments


class ParserEngine(str, Enum):
    """Available parser engines."""
    LXML = "lxml"
    TRANSLATE_TOOLKIT = "translate-toolkit"


class FileParseRequest(BaseModel):
    """File parsing request with optional parser selection."""
    parser_engine: ParserEngine = Field(
        default=ParserEngine.LXML,
        description="Parser engine to use (lxml or translate-toolkit)"
    )


class SetAPIKeyRequest(BaseModel):
    """API key configuration request."""
    engine: Literal["openai", "gemini"] = Field(..., description="AI engine")
    api_key: str = Field(..., min_length=10, description="API key")

    @validator('engine')
    def validate_engine(cls, engine: str) -> str:
        """Validate engine name."""
        if engine not in ["openai", "gemini"]:
            raise ValueError("Engine must be 'openai' or 'gemini'")
        return engine.lower()

    @validator('api_key')
    def validate_api_key(cls, key: str) -> str:
        """Validate API key format."""
        key = key.strip()
        if len(key) < 10:
            raise ValueError("API key too short")
        return key


class SetDefaultEngineRequest(BaseModel):
    """Default engine configuration request."""
    engine: Literal["openai", "gemini", "mock"] = Field(..., description="Default AI engine")

    @validator('engine')
    def validate_engine(cls, engine: str) -> str:
        """Validate engine name."""
        if engine not in ["openai", "gemini", "mock"]:
            raise ValueError("Engine must be 'openai', 'gemini', or 'mock'")
        return engine.lower()


# Response models for consistency
class QAIssueResponse(BaseModel):
    """QA issue response."""
    segment_id: str
    check_type: str
    severity: Literal["error", "warning", "info"]
    message: str
    source_text: Optional[str] = None
    target_text: Optional[str] = None
    details: Dict[str, Any] = {}


class QASummaryResponse(BaseModel):
    """QA results summary."""
    total_issues: int
    by_type: Dict[str, int]
    by_severity: Dict[str, int]


class QACheckResponse(BaseModel):
    """QA check response."""
    total_issues: int
    issues: List[QAIssueResponse]
    summary: QASummaryResponse
    mode: QAMode


def validate_request(request_data: dict, validation_model: type) -> tuple[bool, str, Optional[BaseModel]]:
    """
    Validate request data against a Pydantic model.

    Returns:
        tuple: (is_valid, error_message, validated_data)
    """
    try:
        validated = validation_model(**request_data)
        return True, "", validated
    except Exception as e:
        return False, str(e), None
