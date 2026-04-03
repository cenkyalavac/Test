"""
Translate-Toolkit based parser for XLIFF files.

This is an optional parser that can be used as an alternative to the default lxml parser
for users who experience parsing issues.
"""

from typing import List, Optional
from pathlib import Path

try:
    from translate.storage import xliff
except ImportError:
    xliff = None

from ..parser.models import Segment


class ToolkitXLIFFParser:
    """Parse XLIFF files using translate-toolkit library."""

    def __init__(self):
        """Initialize toolkit parser."""
        if xliff is None:
            raise ImportError(
                "translate-toolkit not installed. "
                "Install with: pip install translate-toolkit"
            )

    def parse_file(self, file_path: str) -> List[Segment]:
        """
        Parse XLIFF file using translate-toolkit.

        Args:
            file_path: Path to XLIFF file

        Returns:
            List of Segment objects
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            # Open with translate-toolkit
            xliff_file = xliff.xlifffile()
            xliff_file.parse(str(file_path))

            segments = []

            # Iterate through translation units
            for unit in xliff_file.units:
                # Skip header unit
                if not unit.istranslatable():
                    continue

                segment = self._convert_unit_to_segment(unit)
                if segment:
                    segments.append(segment)

            return segments

        except Exception as e:
            raise ValueError(f"Error parsing XLIFF file with translate-toolkit: {str(e)}")

    def parse_string(self, content: bytes) -> List[Segment]:
        """
        Parse XLIFF content from bytes.

        Args:
            content: XLIFF file content as bytes

        Returns:
            List of Segment objects
        """
        try:
            xliff_file = xliff.xlifffile()
            xliff_file.parse(content)

            segments = []

            for unit in xliff_file.units:
                if not unit.istranslatable():
                    continue

                segment = self._convert_unit_to_segment(unit)
                if segment:
                    segments.append(segment)

            return segments

        except Exception as e:
            raise ValueError(f"Error parsing XLIFF string with translate-toolkit: {str(e)}")

    @staticmethod
    def _convert_unit_to_segment(unit) -> Optional[Segment]:
        """
        Convert a translate-toolkit unit to Segment object.

        Args:
            unit: translate-toolkit translation unit

        Returns:
            Segment object or None if invalid
        """
        try:
            # Extract basic info
            segment_id = unit.getid() or f"seg_{id(unit)}"
            source_text = unit.source or ""
            target_text = unit.target or ""

            # Extract status
            status = "translated" if target_text else "untranslated"
            if hasattr(unit, "state"):
                state = unit.state
                if state == "signed-off":
                    status = "translated"
                elif state == "translated":
                    status = "translated"
                elif state == "needs-translation":
                    status = "untranslated"

            # Extract metadata
            source_language = None
            target_language = None

            if hasattr(unit, "source_lang"):
                source_language = unit.source_lang

            if hasattr(unit, "target_lang"):
                target_language = unit.target_lang

            # Create segment
            segment = Segment(
                segment_id=segment_id,
                source_text=source_text,
                target_text=target_text,
                status=status,
                source_language=source_language,
                target_language=target_language,
                metadata={
                    "parser": "translate-toolkit",
                    "parser_notes": unit.notes if hasattr(unit, "notes") else None,
                    "context": unit.getcontext() if hasattr(unit, "getcontext") else None,
                }
            )

            return segment

        except Exception as e:
            print(f"Warning: Could not convert unit: {str(e)}")
            return None


class ToolkitParserFactory:
    """Factory for creating toolkit parser with error handling."""

    @staticmethod
    def create_parser():
        """Create toolkit parser instance."""
        try:
            return ToolkitXLIFFParser()
        except ImportError as e:
            return None

    @staticmethod
    def is_available() -> bool:
        """Check if translate-toolkit is installed."""
        try:
            import translate.storage.xliff
            return True
        except ImportError:
            return False
