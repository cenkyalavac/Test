"""
PO (Portable Object) file parser strategy.

Supports standard GNU gettext .po files used in many projects
for internationalization (i18n).
Uses polib library for robust PO parsing.
"""

from typing import List, Optional
from pathlib import Path

import polib

from .base_parser import BaseParser, ParsingError
from .models import Segment, SegmentStatus, SegmentMetadata


class POStrategy(BaseParser):
    """
    PO file parser strategy.

    Parses GNU gettext .po (Portable Object) translation files.
    Each entry becomes a segment with context and metadata.
    """

    def __init__(self, file_path: Optional[str] = None):
        """Initialize PO parser."""
        super().__init__(file_path)
        self.po_file: Optional[polib.POFile] = None

    def parse_file(self, file_path: str) -> List[Segment]:
        """
        Parse a PO file.

        Args:
            file_path: Path to .po file

        Returns:
            List of Segment objects

        Raises:
            FileNotFoundError: If file doesn't exist
            ParsingError: If file is invalid
        """
        if not self.validate_file(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                return self.parse_string(content, file_path=file_path)
        except Exception as e:
            raise ParsingError(f"Failed to parse PO file: {e}")

    def parse_string(self, content: str, file_path: Optional[str] = None) -> List[Segment]:
        """
        Parse PO content from string.

        Args:
            content: PO file content as string
            file_path: Optional file path for metadata

        Returns:
            List of Segment objects
        """
        # Clear previous segments
        self.clear_segments()
        self.file_path = file_path

        try:
            # Parse PO content using polib.pofile()
            self.po_file = polib.pofile(content)
        except Exception as e:
            raise ParsingError(f"Invalid PO file: {e}")

        # Extract metadata
        source_lang = self._extract_language(self.po_file.metadata.get("Language", "en"))
        target_lang = self._extract_language(self.po_file.metadata.get("Language"))

        # Process entries
        segment_id = 0
        for entry in self.po_file:
            # Skip header entry
            if entry.msgid == "":
                continue

            segment_id += 1

            # Create segment
            segment = Segment(
                segment_id=f"po_{segment_id}",
                source_text=entry.msgid,
                target_text=entry.msgstr,
                status=self._extract_status(entry),
                source_language=source_lang,
                target_language=target_lang,
                file_path=file_path,
                source_plain_text=entry.msgid,
                target_plain_text=entry.msgstr,
                metadata=self._extract_metadata(entry),
                xliff_version="1.2",  # PO format version
                variant="po",
            )

            self.segments.append(segment)

        return self.segments

    def _extract_status(self, entry: polib.POEntry) -> SegmentStatus:
        """
        Extract segment status from PO entry.

        PO files use flags to indicate status:
        - fuzzy: needs review
        - translated: complete (default if msgstr is not empty)
        - untranslated: msgstr is empty
        """
        # Check if fuzzy
        if "fuzzy" in entry.flags:
            return SegmentStatus.NEEDS_REVIEW

        # Check if translated
        if entry.msgstr:
            return SegmentStatus.TRANSLATED

        return SegmentStatus.NEEDS_TRANSLATION

    def _extract_metadata(self, entry: polib.POEntry) -> SegmentMetadata:
        """Extract metadata from PO entry."""
        metadata = SegmentMetadata()

        # Store context if available
        if entry.msgctxt:
            metadata.context = entry.msgctxt

        # Store all flags as custom attributes
        if entry.flags:
            metadata.custom_attributes["flags"] = list(entry.flags)

        # Store occurrences (file locations)
        if entry.occurrences:
            metadata.custom_attributes["occurrences"] = entry.occurrences

        # Store translator comments
        if entry.tcomment:
            metadata.custom_attributes["translator_comment"] = entry.tcomment

        # Store developer comments
        if entry.comment:
            metadata.custom_attributes["developer_comment"] = entry.comment

        return metadata

    def _extract_language(self, lang_header: Optional[str]) -> Optional[str]:
        """
        Extract language code from PO metadata.

        Handles formats like "en", "fr_FR", "de-DE"
        """
        if not lang_header:
            return None

        # Get base language code
        lang = lang_header.split("_")[0].split("-")[0].lower()
        return lang if lang else None
