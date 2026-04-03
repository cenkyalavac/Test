"""
JSON Parser Strategy for i18n translation files.

Supports common JSON translation formats:
- Flat key-value structure
- Nested object structure (with dot notation flattening)
- i18next format
- Simple key-value format

Commonly used in web/mobile applications.
"""

import json
from typing import List, Optional, Any, Dict
from pathlib import Path

from .base_parser import BaseParser, ParsingError
from .models import Segment, SegmentStatus, SegmentMetadata


class JSONStrategy(BaseParser):
    """
    JSON file parser strategy.

    Parses translation JSON files commonly used in i18n.
    Supports both flat and nested structures.
    """

    def __init__(self, file_path: Optional[str] = None):
        """Initialize JSON parser."""
        super().__init__(file_path)
        self.json_data: Optional[Dict[str, Any]] = None

    def parse_file(self, file_path: str) -> List[Segment]:
        """
        Parse a JSON translation file.

        Args:
            file_path: Path to .json file

        Returns:
            List of Segment objects

        Raises:
            FileNotFoundError: If file doesn't exist
            ParsingError: If JSON is invalid
        """
        if not self.validate_file(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                return self.parse_string(content, file_path=file_path)
        except json.JSONDecodeError as e:
            raise ParsingError(f"Invalid JSON: {e}")

    def parse_string(self, content: str, file_path: Optional[str] = None) -> List[Segment]:
        """
        Parse JSON content from string.

        Args:
            content: JSON content as string
            file_path: Optional file path for metadata

        Returns:
            List of Segment objects
        """
        # Clear previous segments
        self.clear_segments()
        self.file_path = file_path

        try:
            self.json_data = json.loads(content)
        except json.JSONDecodeError as e:
            raise ParsingError(f"Invalid JSON: {e}")

        if not isinstance(self.json_data, dict):
            raise ParsingError("JSON root must be an object/dictionary")

        # Detect format and extract segments
        self._process_json_structure(self.json_data, file_path)

        return self.segments

    def _process_json_structure(self, data: Dict[str, Any], file_path: Optional[str]) -> None:
        """
        Process JSON structure and extract segments.

        Handles both flat and nested structures.
        """
        # Check if this looks like a translation pair structure
        # (e.g., {"en": {...}, "fr": {...}})
        potential_langs = self._detect_language_structure(data)

        if potential_langs:
            # Multi-language format
            self._process_multi_language(data, file_path)
        else:
            # Single language format (source -> target pairs)
            self._process_flat_structure(data, "", file_path)

    def _detect_language_structure(self, data: Dict[str, Any]) -> List[str]:
        """
        Detect if JSON has language-keyed structure.

        Returns list of detected language codes if found.
        """
        lang_codes = []
        iso_langs = {
            "en", "fr", "de", "es", "it", "pt", "ru", "ja", "zh", "ko",
            "ar", "hi", "pl", "tr", "nl", "sv", "no", "da", "fi"
        }

        for key in data.keys():
            if isinstance(data[key], dict) and key.lower() in iso_langs:
                lang_codes.append(key)

        return lang_codes

    def _process_multi_language(self, data: Dict[str, Any], file_path: Optional[str]) -> None:
        """
        Process language-keyed JSON structure.

        Example:
        {
          "en": {"hello": "Hello", "goodbye": "Goodbye"},
          "fr": {"hello": "Bonjour", "goodbye": "Au revoir"}
        }
        """
        languages = list(data.keys())
        source_lang = languages[0] if languages else "en"
        target_lang = languages[1] if len(languages) > 1 else None

        # Get source and target dictionaries
        source_dict = data.get(source_lang, {})
        target_dict = data.get(target_lang, {}) if target_lang else {}

        # Flatten and match
        source_flat = self._flatten_dict(source_dict)
        target_flat = self._flatten_dict(target_dict)

        # Create segments
        segment_id = 0
        for key, source_text in source_flat.items():
            segment_id += 1
            target_text = target_flat.get(key, "")

            segment = Segment(
                segment_id=f"json_{segment_id}",
                source_text=str(source_text),
                target_text=str(target_text),
                status=self._extract_status(source_text, target_text),
                source_language=source_lang,
                target_language=target_lang,
                file_path=file_path,
                source_plain_text=str(source_text),
                target_plain_text=str(target_text),
                metadata=SegmentMetadata(context=key),
                xliff_version="1.2",
                variant="json",
            )

            self.segments.append(segment)

    def _process_flat_structure(
        self, data: Dict[str, Any], prefix: str, file_path: Optional[str]
    ) -> None:
        """
        Process flat or nested JSON structure.

        Flattens nested objects into dot-notation keys.
        """
        segment_id = len(self.segments)

        for key, value in data.items():
            # Build full key with prefix
            full_key = f"{prefix}.{key}" if prefix else key

            if isinstance(value, dict):
                # Nested object - recurse
                self._process_flat_structure(value, full_key, file_path)
            elif isinstance(value, str):
                # String value - create segment
                segment_id += 1

                segment = Segment(
                    segment_id=f"json_{segment_id}",
                    source_text=value,
                    target_text="",  # Typically used for source files
                    status=SegmentStatus.NEEDS_TRANSLATION,
                    file_path=file_path,
                    source_plain_text=value,
                    target_plain_text="",
                    metadata=SegmentMetadata(context=full_key),
                    xliff_version="1.2",
                    variant="json",
                )

                self.segments.append(segment)

    def _flatten_dict(self, data: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
        """
        Flatten nested dictionary to dot-notation.

        Example:
        {"a": {"b": {"c": "value"}}} -> {"a.b.c": "value"}
        """
        result = {}

        for key, value in data.items():
            full_key = f"{prefix}.{key}" if prefix else key

            if isinstance(value, dict):
                result.update(self._flatten_dict(value, full_key))
            else:
                result[full_key] = value

        return result

    def _extract_status(self, source_text: Any, target_text: Any) -> SegmentStatus:
        """Determine segment status based on content."""
        target_str = str(target_text).strip() if target_text else ""

        if not target_str:
            return SegmentStatus.NEEDS_TRANSLATION
        if target_str == str(source_text).strip():
            return SegmentStatus.NEEDS_REVIEW  # Not actually translated
        return SegmentStatus.TRANSLATED
