"""
Parser package for Translation QA Tool.

Provides unified parsing interface for multiple translation formats:
- XLIFF 1.2, 2.0 (and Trados, MemoQ variants)
- PO (Portable Object) files
- JSON i18n files
- Extensible strategy pattern for future formats
"""

from .models import (
    Segment,
    SegmentStatus,
    SegmentMetadata,
    InlineTag,
    TextFormat,
)
from .base_parser import BaseParser, ParsingError, UnsupportedFormatError
from .xliff_parser import XLIFFParser, XLIFFValidationError
from .xliff_strategy import XLIFFStrategy
from .po_strategy import POStrategy
from .json_strategy import JSONStrategy
from .parser_factory import ParserFactory

__all__ = [
    # Models
    "Segment",
    "SegmentStatus",
    "SegmentMetadata",
    "InlineTag",
    "TextFormat",
    # Base classes
    "BaseParser",
    "ParsingError",
    "UnsupportedFormatError",
    # Legacy XLIFF parser
    "XLIFFParser",
    "XLIFFValidationError",
    # Strategies
    "XLIFFStrategy",
    "POStrategy",
    "JSONStrategy",
    # Factory
    "ParserFactory",
]
