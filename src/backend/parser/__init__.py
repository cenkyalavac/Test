"""
XLIFF Parser package for Translation QA Tool.

Provides robust parsing of XLIFF 1.2, 2.0, and proprietary variants
(SDL Trados, MemoQ).
"""

from .models import (
    Segment,
    SegmentStatus,
    SegmentMetadata,
    InlineTag,
    TextFormat,
)
from .xliff_parser import XLIFFParser, XLIFFValidationError

__all__ = [
    "Segment",
    "SegmentStatus",
    "SegmentMetadata",
    "InlineTag",
    "TextFormat",
    "XLIFFParser",
    "XLIFFValidationError",
]
