"""
Abstract base parser interface for translation file formats.

Defines the strategy interface that all concrete parsers must implement.
Enables consistent handling of multiple file formats (XLIFF, PO, JSON, etc.)
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional

from .models import Segment


class BaseParser(ABC):
    """
    Abstract base class for translation file parsers.

    Defines the interface that all concrete parser strategies must implement.
    This allows for a unified API regardless of the underlying file format.
    """

    def __init__(self, file_path: Optional[str] = None):
        """
        Initialize the parser.

        Args:
            file_path: Optional file path for metadata tracking
        """
        self.file_path = file_path
        self.segments: List[Segment] = []

    @abstractmethod
    def parse_file(self, file_path: str) -> List[Segment]:
        """
        Parse a translation file and extract all segments.

        Args:
            file_path: Path to the translation file

        Returns:
            List of Segment objects

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file format is invalid
        """
        pass

    @abstractmethod
    def parse_string(self, content: str) -> List[Segment]:
        """
        Parse translation content from a string.

        Args:
            content: File content as string

        Returns:
            List of Segment objects
        """
        pass

    def validate_file(self, file_path: str) -> bool:
        """
        Validate that the file exists and has the correct format.

        Args:
            file_path: Path to validate

        Returns:
            True if file is valid, False otherwise
        """
        path = Path(file_path)
        if not path.exists():
            return False
        return path.is_file()

    def get_segments(self) -> List[Segment]:
        """
        Get the parsed segments.

        Returns:
            List of Segment objects
        """
        return self.segments

    def clear_segments(self) -> None:
        """Clear all parsed segments."""
        self.segments = []

    def segment_count(self) -> int:
        """Get the total count of parsed segments."""
        return len(self.segments)


class ParsingError(Exception):
    """Raised when parsing fails."""
    pass


class UnsupportedFormatError(ParsingError):
    """Raised when file format is not supported."""
    pass
