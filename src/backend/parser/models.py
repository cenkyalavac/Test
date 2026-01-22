"""
Data models for XLIFF segment representation.
Used by XLIFFParser to structure extracted translation data.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum


class SegmentStatus(str, Enum):
    """Enumeration for XLIFF segment states."""
    TRANSLATED = "translated"
    NEEDS_TRANSLATION = "needs-translation"
    NEEDS_REVIEW = "needs-review"
    NEEDS_L10N = "needs-l10n"
    NEEDS_ADAPTATION = "needs-adaptation"
    REVIEWED = "reviewed"
    SIGNED_OFF = "signed-off"
    DRAFT = "draft"
    LOCKED = "locked"
    FINAL = "final"
    UNKNOWN = "unknown"


class TextFormat(str, Enum):
    """Text extraction format options."""
    PLAIN = "plain"  # No inline markup
    WITH_PLACEHOLDERS = "with_placeholders"  # {1}, {2} style placeholders


@dataclass
class InlineTag:
    """Represents an inline XML tag within a segment."""
    tag_id: str
    tag_type: str  # 'g', 'x', 'bx', 'ex', 'ph', 'mrk'
    content: str  # Captured text or placeholder reference
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SegmentMetadata:
    """Metadata associated with a translation segment."""
    match_quality: Optional[int] = None  # 0-100, e.g., fuzzy match percentage
    confirmation_status: Optional[str] = None  # e.g., 'approved', 'unapproved'
    segment_status: Optional[str] = None  # Custom Trados/MemoQ segment status
    priority: Optional[int] = None
    context: Optional[str] = None
    domain: Optional[str] = None
    custom_attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Segment:
    """
    Represents a single translation unit (segment) from an XLIFF document.

    This is the primary output object from XLIFFParser. It encapsulates
    all extracted information about a source-target translation pair.
    """
    segment_id: str
    source_text: str
    target_text: str
    status: SegmentStatus
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    file_path: Optional[str] = None

    # Content with inline markup tracking
    source_plain_text: Optional[str] = None
    target_plain_text: Optional[str] = None
    source_with_placeholders: Optional[str] = None
    target_with_placeholders: Optional[str] = None

    # Inline tags
    source_inline_tags: List[InlineTag] = field(default_factory=list)
    target_inline_tags: List[InlineTag] = field(default_factory=list)

    # Metadata
    metadata: SegmentMetadata = field(default_factory=SegmentMetadata)

    # XLIFF version info
    xliff_version: str = "1.2"  # Default, can be "2.0", "1.2"

    # Variant info
    variant: str = "standard"  # 'standard', 'trados', 'memoq'

    def __str__(self) -> str:
        return (
            f"Segment(id={self.segment_id}, status={self.status.value}, "
            f"source={self.source_text[:50]}..., target={self.target_text[:50]}...)"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert segment to dictionary for serialization."""
        return {
            "segment_id": self.segment_id,
            "source_text": self.source_text,
            "target_text": self.target_text,
            "status": self.status.value,
            "source_language": self.source_language,
            "target_language": self.target_language,
            "file_path": self.file_path,
            "source_plain_text": self.source_plain_text,
            "target_plain_text": self.target_plain_text,
            "source_with_placeholders": self.source_with_placeholders,
            "target_with_placeholders": self.target_with_placeholders,
            "metadata": {
                "match_quality": self.metadata.match_quality,
                "confirmation_status": self.metadata.confirmation_status,
                "segment_status": self.metadata.segment_status,
                "priority": self.metadata.priority,
                "context": self.metadata.context,
                "domain": self.metadata.domain,
            },
            "xliff_version": self.xliff_version,
            "variant": self.variant,
        }
