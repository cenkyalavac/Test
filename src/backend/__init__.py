"""
Backend module for Translation QA Tool.

Provides XLIFF parsing and translation quality analysis capabilities.
"""

from .parser import (
    XLIFFParser,
    Segment,
    SegmentStatus,
    SegmentMetadata,
    InlineTag,
)

__all__ = [
    "XLIFFParser",
    "Segment",
    "SegmentStatus",
    "SegmentMetadata",
    "InlineTag",
]
