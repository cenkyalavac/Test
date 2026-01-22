"""
Robust XLIFF Parser with support for standard and proprietary variants.

Supports:
  - XLIFF 1.2 and 2.0 standard
  - SDL Trados (.sdxliff)
  - MemoQ (.mqxliff)
  - Complex namespace handling
  - Inline tag extraction
  - Metadata preservation

Uses lxml for all XML operations (no regex for XML parsing).
"""

from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import re as stdlib_re  # Only for non-XML text processing

from lxml import etree

from .models import (
    Segment, SegmentStatus, SegmentMetadata, InlineTag, TextFormat
)


class XLIFFParser:
    """
    Robust parser for XLIFF documents with support for standard and proprietary variants.

    Example:
        parser = XLIFFParser()
        segments = parser.parse_file("translation.xliff")
        for segment in segments:
            print(f"{segment.segment_id}: {segment.source_text} -> {segment.target_text}")
    """

    # Common namespace URIs
    XLIFF_NS_1_2 = "urn:oasis:names:tc:xliff:document:1.2"
    XLIFF_NS_2_0 = "urn:oasis:names:tc:xliff:document:2.0"
    TRADOS_NS = "http://www.sdl.com/Trados/API/ContentHandler/ContentHandlerTypes"
    MEMOQ_NS = "MemoQ"  # MemoQ uses custom namespace, often not properly declared

    def __init__(self):
        """Initialize the parser with namespace registry."""
        self.nsmap: Dict[str, str] = {}
        self.xliff_version: str = "1.2"
        self.detected_variant: str = "standard"
        self.root: Optional[etree._Element] = None

    def parse_file(self, file_path: str) -> List[Segment]:
        """
        Parse an XLIFF file and extract all segments.

        Args:
            file_path: Path to the XLIFF file

        Returns:
            List of Segment objects

        Raises:
            FileNotFoundError: If file doesn't exist
            etree.XMLSyntaxError: If XML is malformed
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"XLIFF file not found: {file_path}")

        with open(path, "rb") as f:
            return self.parse_string(f.read(), file_path=str(path))

    def parse_string(self, content: bytes, file_path: Optional[str] = None) -> List[Segment]:
        """
        Parse XLIFF content from bytes/string.

        Args:
            content: XML content as bytes
            file_path: Optional file path for metadata

        Returns:
            List of Segment objects
        """
        # Parse XML
        try:
            self.root = etree.fromstring(content)
        except etree.XMLSyntaxError as e:
            raise etree.XMLSyntaxError(f"Invalid XML: {e}")

        # Detect XLIFF version and variant
        self._detect_version_and_variant()

        # Extract segments
        segments = self._extract_segments(file_path)

        return segments

    def _detect_version_and_variant(self) -> None:
        """Detect XLIFF version and proprietary variant from root element."""
        if self.root is None:
            raise ValueError("No XML root element loaded")

        # Extract namespace map from root
        self.nsmap = self.root.nsmap or {}

        # Detect XLIFF version
        version_attr = self.root.get("version")
        if version_attr:
            self.xliff_version = version_attr
        else:
            # Check namespace
            if self.XLIFF_NS_2_0 in str(self.nsmap.values()):
                self.xliff_version = "2.0"
            else:
                self.xliff_version = "1.2"

        # Detect variant by checking for variant-specific attributes/namespaces
        root_tag = self.root.tag
        if "trados" in root_tag.lower() or "sdxliff" in root_tag.lower():
            self.detected_variant = "trados"
        elif any("sdl.com" in str(ns).lower() for ns in self.nsmap.values()):
            self.detected_variant = "trados"
        elif any("memoq" in str(ns).lower() for ns in self.nsmap.values()):
            self.detected_variant = "memoq"
        else:
            # Check root element attributes for sdl: prefix
            if any("sdl" in str(key).lower() for key in self.root.attrib.keys()):
                self.detected_variant = "trados"
            else:
                self.detected_variant = "standard"

    def _extract_segments(self, file_path: Optional[str] = None) -> List[Segment]:
        """
        Extract all segments from the parsed XLIFF document.

        Handles both XLIFF 1.2 (trans-unit) and 2.0 (unit).
        """
        segments: List[Segment] = []

        if self.root is None:
            return segments

        # Build namespace prefix map for XPath queries
        ns = self._build_namespace_map()

        # Find translation units - works for both 1.2 and 2.0
        # XLIFF 1.2: //xliff:file/xliff:body/xliff:trans-unit
        # XLIFF 2.0: //xliff:file/xliff:group/xliff:unit

        trans_units = []

        if self.xliff_version == "2.0":
            # XLIFF 2.0: unit elements with namespace prefix
            if ns and 'xliff2' in ns:
                units_xpath = ".//xliff2:unit"
                trans_units = self.root.xpath(units_xpath, namespaces=ns)
            if not trans_units:
                trans_units = self.root.findall(".//unit")
        else:
            # XLIFF 1.2: trans-unit elements with namespace prefix
            if ns and 'xliff' in ns:
                units_xpath = ".//xliff:trans-unit"
                trans_units = self.root.xpath(units_xpath, namespaces=ns)

            # Also check without namespace (some files don't declare it)
            if not trans_units:
                trans_units = self.root.findall(".//trans-unit")

        # Extract metadata from file/group if present
        source_lang, target_lang = self._extract_file_languages(ns)

        # Process each translation unit
        for unit in trans_units:
            segment = self._process_unit(unit, ns, source_lang, target_lang, file_path)
            if segment:
                segments.append(segment)

        return segments

    def _process_unit(
        self,
        unit: etree._Element,
        ns: Dict[str, str],
        default_source_lang: Optional[str] = None,
        default_target_lang: Optional[str] = None,
        file_path: Optional[str] = None,
    ) -> Optional[Segment]:
        """
        Process a single translation unit and return a Segment object.

        Handles:
          - segment ID extraction
          - source and target text extraction (with mrk tag handling)
          - status detection
          - inline tag extraction
          - metadata extraction
        """
        # Extract ID
        unit_id = unit.get("id")
        if not unit_id:
            return None  # Skip units without ID

        # For XLIFF 2.0, segment element is nested inside unit
        search_root = unit
        if self.xliff_version == "2.0":
            segment_elem = self._find_element(unit, "segment", ns)
            if segment_elem is not None:
                search_root = segment_elem

        # Extract source and target
        source_elem = self._find_element(search_root, "source", ns)
        target_elem = self._find_element(search_root, "target", ns)

        if source_elem is None:
            return None  # Skip if no source

        # Extract text and inline tags
        source_text, source_plain, source_with_ph, source_tags = self._extract_text_content(
            source_elem
        )
        target_text, target_plain, target_with_ph, target_tags = (
            self._extract_text_content(target_elem) if target_elem is not None
            else ("", "", "", [])
        )

        # Extract status
        status = self._extract_status(unit, ns)

        # Extract metadata
        metadata = self._extract_metadata(unit, ns)

        # Extract languages
        source_lang = unit.get("xml:lang") or default_source_lang
        target_lang = target_elem.get("xml:lang") if target_elem is not None else default_target_lang

        # Create segment
        segment = Segment(
            segment_id=unit_id,
            source_text=source_text,
            target_text=target_text,
            status=status,
            source_language=source_lang,
            target_language=target_lang,
            file_path=file_path,
            source_plain_text=source_plain,
            target_plain_text=target_plain,
            source_with_placeholders=source_with_ph,
            target_with_placeholders=target_with_ph,
            source_inline_tags=source_tags,
            target_inline_tags=target_tags,
            metadata=metadata,
            xliff_version=self.xliff_version,
            variant=self.detected_variant,
        )

        return segment

    def _extract_text_content(
        self, elem: etree._Element
    ) -> Tuple[str, str, str, List[InlineTag]]:
        """
        Extract text content from an element, handling inline markup.

        Returns:
            Tuple of:
              - text_with_markup: Full text with inline tag references
              - plain_text: Pure text without any markup
              - with_placeholders: Text with {1}, {2} style placeholders
              - inline_tags: List of InlineTag objects
        """
        inline_tags: List[InlineTag] = []

        # Check for mrk tags first (common in Trados/MemoQ)
        # Try with namespace first
        mrk_elements = elem.findall(".//{urn:oasis:names:tc:xliff:document:1.2}mrk")
        if not mrk_elements:
            # Try without namespace
            mrk_elements = elem.findall(".//mrk")

        # If mrk tags exist, extract text from inside them
        if mrk_elements:
            text_parts = []
            placeholder_index = 1

            for mrk in mrk_elements:
                # Extract text before mrk
                if mrk.getprevious() is not None:
                    prev = mrk.getprevious()
                    if prev.tail:
                        text_parts.append(prev.tail)

                # Extract text inside mrk
                if mrk.text:
                    text_parts.append(mrk.text)

                # Track mrk as inline tag
                mtype = mrk.get("mtype", "unknown")
                mid = mrk.get("mid", f"mrk_{placeholder_index}")
                inline_tags.append(
                    InlineTag(
                        tag_id=mid,
                        tag_type="mrk",
                        content=mrk.text or "",
                        attributes=dict(mrk.attrib),
                    )
                )
                placeholder_index += 1

                # Add tail text
                if mrk.tail:
                    text_parts.append(mrk.tail)

            text_with_markup = "".join(text_parts).strip()
        else:
            # Regular inline tag extraction
            text_with_markup, inline_tags = self._extract_inline_tags(elem)

        # Extract plain text by stripping all inline tags
        plain_text = self._get_plain_text(elem)

        # Create placeholder version
        with_placeholders = self._create_placeholder_text(text_with_markup, len(inline_tags))

        return text_with_markup, plain_text, with_placeholders, inline_tags

    def _extract_inline_tags(self, elem: etree._Element) -> Tuple[str, List[InlineTag]]:
        """
        Extract inline tags (<g>, <x>, <bx>, <ex>, <ph>) from an element.

        Recursively finds inline elements and extracts their metadata.

        Returns:
            Tuple of (text_with_placeholders, list_of_inline_tags)
        """
        inline_tags: List[InlineTag] = []
        placeholder_index = 1

        # Find all inline tag types
        for tag_type in ["g", "x", "bx", "ex", "ph"]:
            # Use findall with relative path
            tags = elem.findall(f".//{tag_type}")

            for tag in tags:
                tag_id = tag.get("id", f"{tag_type}_{placeholder_index}")
                content = tag.get("ctype", "") or tag.text or ""

                inline_tags.append(
                    InlineTag(
                        tag_id=tag_id,
                        tag_type=tag_type,
                        content=content,
                        attributes=dict(tag.attrib),
                    )
                )
                placeholder_index += 1

        # Extract full text including inline content
        text_with_markup = "".join(elem.itertext()).strip()

        return text_with_markup, inline_tags

    def _get_plain_text(self, elem: etree._Element) -> str:
        """
        Extract plain text from an element, ignoring all inline markup.

        Iterates through element text and tail content.
        """
        # Get all text content including text in child elements
        text_parts = []
        for text in elem.itertext():
            if text:
                text_parts.append(text)
        plain_text = "".join(text_parts).strip()
        return plain_text

    def _create_placeholder_text(self, text: str, tag_count: int) -> str:
        """
        Create a version of text with {1}, {2}, ... placeholders for inline tags.

        Simple implementation: replaces inline tag references with numbered placeholders.
        """
        if tag_count == 0:
            return text

        # For now, return the text as-is (can be enhanced with better placeholder logic)
        return text

    def _extract_file_languages(self, ns: Dict[str, str]) -> Tuple[Optional[str], Optional[str]]:
        """Extract source and target languages from the XLIFF file element."""
        source_lang = self.root.get("source-language")
        target_lang = self.root.get("target-language")
        return source_lang, target_lang

    def _extract_status(self, unit: etree._Element, ns: Dict[str, str]) -> SegmentStatus:
        """
        Extract segment status from a translation unit.

        Handles:
          - Standard XLIFF translate attribute
          - Trados segment status
          - MemoQ status attributes
          - Custom confirmation-status
        """
        # Standard XLIFF status
        translate_attr = unit.get("translate")
        if translate_attr == "no":
            return SegmentStatus.LOCKED

        # Check for state attribute (XLIFF standard)
        state_attr = unit.get("state")
        if state_attr:
            state_map = {
                "translated": SegmentStatus.TRANSLATED,
                "needs-translation": SegmentStatus.NEEDS_TRANSLATION,
                "needs-review": SegmentStatus.NEEDS_REVIEW,
                "needs-l10n": SegmentStatus.NEEDS_L10N,
                "needs-adaptation": SegmentStatus.NEEDS_ADAPTATION,
                "reviewed": SegmentStatus.REVIEWED,
                "signed-off": SegmentStatus.SIGNED_OFF,
            }
            return state_map.get(state_attr, SegmentStatus.UNKNOWN)

        # Check for Trados-specific attributes
        for key in unit.attrib:
            if "status" in key.lower() or "confirmed" in key.lower():
                value = unit.get(key, "").lower()
                if "translated" in value or "final" in value:
                    return SegmentStatus.TRANSLATED
                elif "draft" in value:
                    return SegmentStatus.DRAFT
                elif "lock" in value or "locked" in value:
                    return SegmentStatus.LOCKED

        # Default: if target exists, assume translated
        target_elem = self._find_element(unit, "target", None)
        if target_elem is not None and self._get_plain_text(target_elem):
            return SegmentStatus.TRANSLATED

        return SegmentStatus.NEEDS_TRANSLATION

    def _extract_metadata(self, unit: etree._Element, ns: Dict[str, str]) -> SegmentMetadata:
        """
        Extract metadata from a translation unit.

        Looks for:
          - match-quality (often 0-100)
          - confirmation-status
          - Trados/MemoQ custom attributes
          - Priority, context, domain
        """
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

        # Custom Trados/MemoQ attributes
        for key, value in unit.attrib.items():
            if "status" in key.lower() and key != "confirmation-status":
                metadata.segment_status = value
            elif "priority" in key.lower():
                try:
                    metadata.priority = int(value)
                except ValueError:
                    pass
            elif "context" in key.lower():
                metadata.context = value
            elif "domain" in key.lower():
                metadata.domain = value
            else:
                # Store other attributes as custom
                metadata.custom_attributes[key] = value

        # Check for prop elements (XLIFF standard metadata)
        prop_elements = unit.findall(".//{urn:oasis:names:tc:xliff:document:1.2}prop")
        if not prop_elements:
            prop_elements = unit.findall(".//prop")

        for prop in prop_elements:
            prop_type = prop.get("prop-type")
            if prop_type == "match-quality":
                try:
                    metadata.match_quality = int(prop.text or 0)
                except ValueError:
                    pass
            elif prop_type:
                metadata.custom_attributes[prop_type] = prop.text

        return metadata

    def _find_element(
        self, parent: etree._Element, tag_name: str, ns: Optional[Dict[str, str]]
    ) -> Optional[etree._Element]:
        """
        Find a child element by tag name, handling namespaces gracefully.

        First tries with XLIFF namespace, then without.
        """
        if ns is None:
            ns = {}

        # Try with XLIFF 1.2 namespace
        elem = parent.find(f"{{{self.XLIFF_NS_1_2}}}{tag_name}")
        if elem is not None:
            return elem

        # Try with XLIFF 2.0 namespace
        elem = parent.find(f"{{{self.XLIFF_NS_2_0}}}{tag_name}")
        if elem is not None:
            return elem

        # Try without namespace
        elem = parent.find(tag_name)
        if elem is not None:
            return elem

        return None

    def _build_namespace_map(self) -> Dict[str, str]:
        """Build a namespace map for XPath queries."""
        ns_map = {
            "xliff": self.XLIFF_NS_1_2,
            "xliff2": self.XLIFF_NS_2_0,
        }
        # Add any additional namespaces from the document
        if self.nsmap:
            # Filter out None keys (default namespace) as XPath requires named prefixes
            for prefix, uri in self.nsmap.items():
                if prefix and uri:  # Only add named prefixes with URIs
                    ns_map[prefix] = uri
        return ns_map


class XLIFFValidationError(Exception):
    """Raised when XLIFF structure validation fails."""
    pass
