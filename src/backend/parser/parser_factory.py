"""
Parser Factory using Strategy Pattern.

Automatically detects file format and returns appropriate parser.
Supports XLIFF, PO, JSON, and extensions for future formats.
"""

from pathlib import Path
from typing import Optional

from .base_parser import BaseParser, UnsupportedFormatError
from .xliff_strategy import XLIFFStrategy
from .po_strategy import POStrategy
from .json_strategy import JSONStrategy


class ParserFactory:
    """
    Factory for creating appropriate parser based on file extension.

    Implements the Factory Pattern to handle multiple file formats
    with a unified interface.

    Example:
        parser = ParserFactory.create("translations.xliff")
        segments = parser.parse_file("translations.xliff")
    """

    # Supported file extensions mapped to parser classes
    PARSERS = {
        ".xliff": XLIFFStrategy,
        ".sdxliff": XLIFFStrategy,  # SDL Trados variant
        ".mqxliff": XLIFFStrategy,  # MemoQ variant
        ".xlf": XLIFFStrategy,      # Short extension
        ".po": POStrategy,
        ".pot": POStrategy,         # PO Template
        ".json": JSONStrategy,
        ".i18n.json": JSONStrategy,
    }

    @staticmethod
    def create(file_path: str) -> BaseParser:
        """
        Create appropriate parser for file.

        Args:
            file_path: Path to translation file

        Returns:
            Parser instance for the file type

        Raises:
            UnsupportedFormatError: If file format not supported
        """
        path = Path(file_path)
        extension = path.suffix.lower()

        # Try exact extension match
        if extension in ParserFactory.PARSERS:
            parser_class = ParserFactory.PARSERS[extension]
            return parser_class(file_path)

        # Try double extension (e.g., .i18n.json)
        name = path.name.lower()
        for ext_pattern, parser_class in ParserFactory.PARSERS.items():
            if name.endswith(ext_pattern.lstrip(".")):
                return parser_class(file_path)

        # Unsupported format
        raise UnsupportedFormatError(
            f"Unsupported file format: {extension}. "
            f"Supported formats: {', '.join(ParserFactory.PARSERS.keys())}"
        )

    @staticmethod
    def get_supported_extensions() -> list:
        """Get list of supported file extensions."""
        return list(ParserFactory.PARSERS.keys())

    @staticmethod
    def detect_format(file_path: str) -> str:
        """
        Detect the format of a translation file.

        Args:
            file_path: Path to file

        Returns:
            Format name (xliff, po, json, etc.)
        """
        path = Path(file_path)
        extension = path.suffix.lower()

        if extension in [".xliff", ".sdxliff", ".mqxliff", ".xlf"]:
            return "xliff"
        elif extension in [".po", ".pot"]:
            return "po"
        elif extension in [".json", ".i18n.json"]:
            return "json"

        return "unknown"

    @staticmethod
    def is_supported(file_path: str) -> bool:
        """Check if file format is supported."""
        try:
            ParserFactory.create(file_path)
            return True
        except UnsupportedFormatError:
            return False
