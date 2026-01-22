"""
XLIFF Parser Strategy implementation.

Supports XLIFF 1.2, 2.0, SDL Trados, and MemoQ variants.
Implements BaseParser interface for unified file handling.
"""

from typing import Dict, List, Optional, Tuple
from pathlib import Path

from lxml import etree

from .base_parser import BaseParser, ParsingError
from .models import Segment, SegmentStatus, SegmentMetadata, InlineTag


class XLIFFStrategy(BaseParser):
    """
    XLIFF file parser strategy.

    Handles standard XLIFF 1.2/2.0 and proprietary variants
    (SDL Trados .sdxliff, MemoQ .mqxliff).
    """

    # Namespace URIs
    XLIFF_NS_1_2 = "urn:oasis:names:tc:xliff:document:1.2"
    XLIFF_NS_2_0 = "urn:oasis:names:tc:xliff:document:2.0"
    TRADOS_NS = "http://www.sdl.com/Trados/API/ContentHandler/ContentHandlerTypes"

    def __init__(self, file_path: Optional[str] = None):
        """Initialize XLIFF parser."""
        super().__init__(file_path)
        self.xliff_version: str = "1.2"
        self.detected_variant: str = "standard"
        self.root: Optional[etree._Element] = None
        self.nsmap: Dict[str, str] = {}

    def parse_file(self, file_path: str) -> List[Segment]:
        """
        Parse an XLIFF file.

        Args:
            file_path: Path to XLIFF file

        Returns:
            List of Segment objects

        Raises:
            FileNotFoundError: If file doesn't exist
            ParsingError: If XML is malformed
        """
        if not self.validate_file(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            with open(file_path, "rb") as f:
                return self.parse_string(f.read().decode("utf-8"), file_path=file_path)
        except etree.XMLSyntaxError as e:
            raise ParsingError(f"Invalid XLIFF XML: {e}")

    def parse_string(self, content: str, file_path: Optional[str] = None) -> List[Segment]:
        """
        Parse XLIFF content from string.

        Args:
            content: XML content as string
            file_path: Optional file path for metadata

        Returns:
            List of Segment objects
        """
        # Clear previous segments
        self.clear_segments()
        self.file_path = file_path

        try:
            # Parse XML
            self.root = etree.fromstring(content.encode("utf-8"))
        except etree.XMLSyntaxError as e:
            raise ParsingError(f"Invalid XML: {e}")

        # Detect version and variant
        self._detect_version_and_variant()

        # Extract segments
        self.segments = self._extract_segments(file_path)

        return self.segments

    def _detect_version_and_variant(self) -> None:
        """Detect XLIFF version and proprietary variant."""
        if self.root is None:
            raise ParsingError("No XML root element loaded")

        # Extract namespace map
        self.nsmap = self.root.nsmap or {}

        # Detect version
        version_attr = self.root.get("version")
        if version_attr:
            self.xliff_version = version_attr
        else:
            if self.XLIFF_NS_2_0 in str(self.nsmap.values()):
                self.xliff_version = "2.0"
            else:
                self.xliff_version = "1.2"

        # Detect variant
        root_tag = self.root.tag
        if "trados" in root_tag.lower() or "sdxliff" in root_tag.lower():
            self.detected_variant = "trados"
        elif any("sdl.com" in str(ns).lower() for ns in self.nsmap.values()):
            self.detected_variant = "trados"
        elif any("memoq" in str(ns).lower() for ns in self.nsmap.values()):
            self.detected_variant = "memoq"
        else:
            if any("sdl" in str(key).lower() for key in self.root.attrib.keys()):
                self.detected_variant = "trados"
            else:
                self.detected_variant = "standard"

    def _extract_segments(self, file_path: Optional[str] = None) -> List[Segment]:
        """Extract all segments from XLIFF."""
        segments: List[Segment] = []

        if self.root is None:
            return segments

        # Find translation units
        trans_units = []

        if self.xliff_version == "2.0":
            # Try with namespace first
            trans_units = self.root.findall(f".//{{{self.XLIFF_NS_2_0}}}unit")
            if not trans_units:
                trans_units = self.root.findall(".//unit")
        else:
            # Try with namespace first
            trans_units = self.root.findall(f".//{{{self.XLIFF_NS_1_2}}}trans-unit")
            if not trans_units:
                trans_units = self.root.findall(".//trans-unit")

        # Extract languages
        source_lang = self.root.get("source-language")
        target_lang = self.root.get("target-language")

        # Process each unit
        for unit in trans_units:
            segment = self._process_unit(unit, source_lang, target_lang, file_path)
            if segment:
                segments.append(segment)

        return segments

    def _process_unit(
        self,
        unit: etree._Element,
        default_source_lang: Optional[str] = None,
        default_target_lang: Optional[str] = None,
        file_path: Optional[str] = None,
    ) -> Optional[Segment]:
        """Process a translation unit."""
        # Extract ID
        unit_id = unit.get("id")
        if not unit_id:
            return None

        # For XLIFF 2.0, segment is nested
        search_root = unit
        if self.xliff_version == "2.0":
            segment_elem = self._find_element(unit, "segment")
            if segment_elem is not None:
                search_root = segment_elem

        # Extract source and target
        source_elem = self._find_element(search_root, "source")
        target_elem = self._find_element(search_root, "target")

        if source_elem is None:
            return None

        # Extract text content
        source_text, source_plain, source_tags = self._extract_text_content(source_elem)
        target_text, target_plain, target_tags = (
            self._extract_text_content(target_elem) if target_elem is not None
            else ("", "", [])
        )

        # Extract status and metadata
        status = self._extract_status(unit)
        metadata = self._extract_metadata(unit)

        # Create segment
        segment = Segment(
            segment_id=unit_id,
            source_text=source_text,
            target_text=target_text,
            status=status,
            source_language=default_source_lang,
            target_language=default_target_lang,
            file_path=file_path,
            source_plain_text=source_plain,
            target_plain_text=target_plain,
            source_inline_tags=source_tags,
            target_inline_tags=target_tags,
            metadata=metadata,
            xliff_version=self.xliff_version,
            variant=self.detected_variant,
        )

        return segment

    def _extract_text_content(self, elem: etree._Element) -> Tuple[str, str, List[InlineTag]]:
        """Extract text and inline tags from element."""
        inline_tags: List[InlineTag] = []

        # Check for mrk tags
        mrk_elements = elem.findall(".//{urn:oasis:names:tc:xliff:document:1.2}mrk")
        if not mrk_elements:
            mrk_elements = elem.findall(".//mrk")

        if mrk_elements:
            # Extract from mrk tags
            text_parts = []
            for idx, mrk in enumerate(mrk_elements, 1):
                if mrk.text:
                    text_parts.append(mrk.text)
                mid = mrk.get("mid", f"mrk_{idx}")
                inline_tags.append(
                    InlineTag(
                        tag_id=mid,
                        tag_type="mrk",
                        content=mrk.text or "",
                        attributes=dict(mrk.attrib),
                    )
                )
            text_with_markup = "".join(text_parts).strip()
        else:
            # Extract inline tags
            text_with_markup, inline_tags = self._extract_inline_tags(elem)

        # Plain text
        plain_text = "".join(elem.itertext()).strip()

        return text_with_markup, plain_text, inline_tags

    def _extract_inline_tags(self, elem: etree._Element) -> Tuple[str, List[InlineTag]]:
        """Extract inline tags from element."""
        inline_tags: List[InlineTag] = []
        placeholder_index = 1

        for tag_type in ["g", "x", "bx", "ex", "ph"]:
            tags = elem.findall(f".//{tag_type}")
            for tag in tags:
                tag_id = tag.get("id", f"{tag_type}_{placeholder_index}")
                inline_tags.append(
                    InlineTag(
                        tag_id=tag_id,
                        tag_type=tag_type,
                        content=tag.get("ctype", "") or tag.text or "",
                        attributes=dict(tag.attrib),
                    )
                )
                placeholder_index += 1

        text_with_markup = "".join(elem.itertext()).strip()
        return text_with_markup, inline_tags

    def _extract_status(self, unit: etree._Element) -> SegmentStatus:
        """Extract segment status."""
        translate_attr = unit.get("translate")
        if translate_attr == "no":
            return SegmentStatus.LOCKED

        state_attr = unit.get("state")
        if state_attr:
            state_map = {
                "translated": SegmentStatus.TRANSLATED,
                "needs-translation": SegmentStatus.NEEDS_TRANSLATION,
                "needs-review": SegmentStatus.NEEDS_REVIEW,
                "reviewed": SegmentStatus.REVIEWED,
                "signed-off": SegmentStatus.SIGNED_OFF,
            }
            return state_map.get(state_attr, SegmentStatus.UNKNOWN)

        # Check for Trados/MemoQ attributes
        for key, value in unit.attrib.items():
            if "status" in key.lower():
                val_lower = value.lower()
                if "translated" in val_lower or "final" in val_lower:
                    return SegmentStatus.TRANSLATED
                elif "draft" in val_lower:
                    return SegmentStatus.DRAFT
                elif "lock" in val_lower:
                    return SegmentStatus.LOCKED

        # Default based on target presence
        target_elem = self._find_element(unit, "target")
        if target_elem is not None and "".join(target_elem.itertext()).strip():
            return SegmentStatus.TRANSLATED

        return SegmentStatus.NEEDS_TRANSLATION

    def _extract_metadata(self, unit: etree._Element) -> SegmentMetadata:
        """Extract metadata from unit."""
        metadata = SegmentMetadata()

        # Match quality
        match_quality_str = unit.get("match-quality")
        if match_quality_str:
            try:
                metadata.match_quality = int(match_quality_str.rstrip("%"))
            except ValueError:
                pass

        # Confirmation status
        metadata.confirmation_status = unit.get("confirmation-status")

        # Other attributes
        for key, value in unit.attrib.items():
            if "status" in key.lower() and key != "confirmation-status":
                metadata.segment_status = value

        return metadata

    def _find_element(self, parent: etree._Element, tag_name: str) -> Optional[etree._Element]:
        """Find child element by tag name."""
        # Try with namespaces
        elem = parent.find(f"{{{self.XLIFF_NS_1_2}}}{tag_name}")
        if elem is not None:
            return elem

        elem = parent.find(f"{{{self.XLIFF_NS_2_0}}}{tag_name}")
        if elem is not None:
            return elem

        # Try without namespace
        return parent.find(tag_name)
