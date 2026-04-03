"""
XBench Checklist XML Parser.

Parses XBench checklist files (.xml format) into Checklist objects
for use in QA validation.
"""

from pathlib import Path
from typing import Optional
from lxml import etree

from .checklist_model import (
    Checklist, CheckRule, CheckTerm, CheckType, SearchMode
)


class ChecklistParser:
    """Parser for XBench Checklist XML format."""

    def parse_file(self, file_path: str) -> Checklist:
        """
        Parse an XBench checklist file.

        Args:
            file_path: Path to .xml checklist file

        Returns:
            Checklist object

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If XML is invalid
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Checklist file not found: {file_path}")

        with open(path, "rb") as f:
            return self.parse_string(f.read())

    def parse_string(self, content: bytes) -> Checklist:
        """
        Parse checklist from XML bytes/string.

        Args:
            content: XML content as bytes

        Returns:
            Checklist object
        """
        try:
            root = etree.fromstring(content)
        except etree.XMLSyntaxError as e:
            raise ValueError(f"Invalid XML: {e}")

        if root.tag != "xbench-checklist":
            raise ValueError("Root element must be 'xbench-checklist'")

        # Extract checklist metadata
        version = root.get("version", "1.1")

        # Find checklist element
        checklist_elem = root.find("checklist")
        if checklist_elem is None:
            raise ValueError("No 'checklist' element found")

        name = checklist_elem.get("name", "Unnamed")
        checklist = Checklist(name=name, version=version)

        # Parse all check rules
        for check_elem in checklist_elem.findall("check"):
            rule = self._parse_check(check_elem)
            if rule:
                checklist.rules.append(rule)

        return checklist

    def _parse_check(self, check_elem: etree._Element) -> Optional[CheckRule]:
        """Parse a single check element."""
        name = check_elem.get("name", "")
        if not name:
            return None

        # Get check attributes
        categories = check_elem.get("categories", "")
        disabled = check_elem.get("disabled", "").lower() == "yes"

        # Extract description
        description_elem = check_elem.find("description")
        description = description_elem.text if description_elem is not None else ""

        # Extract timestamp
        timestamp_elem = check_elem.find("timestamp")
        timestamp = timestamp_elem.text if timestamp_elem is not None else ""

        # Parse source and target terms
        source_term = None
        target_term = None

        for term_elem in check_elem.findall("term"):
            term_type = term_elem.get("type", "")
            term = self._parse_term(term_elem)

            if term_type == "source":
                source_term = term
            elif term_type == "target":
                target_term = term

        # Determine check type from categories
        check_type = self._determine_check_type(categories)

        rule = CheckRule(
            name=name,
            check_type=check_type,
            description=description,
            source_term=source_term,
            target_term=target_term,
            category=categories,
            disabled=disabled,
            timestamp=timestamp,
        )

        return rule

    def _parse_term(self, term_elem: etree._Element) -> CheckTerm:
        """Parse a term element."""
        term_type = term_elem.get("type", "source")
        pattern = term_elem.text or ""
        searchmode_str = term_elem.get("searchmode", "simple")

        # Parse search mode
        try:
            searchmode = SearchMode(searchmode_str)
        except ValueError:
            searchmode = SearchMode.SIMPLE

        # Parse boolean attributes
        powersearch = term_elem.get("powersearch", "").lower() == "yes"
        wholeword = term_elem.get("wholeword", "").lower() == "yes"
        casecheck = term_elem.get("casecheck", "").lower() == "yes"
        notrim = term_elem.get("notrim", "").lower() == "yes"
        normalizewhitespace = term_elem.get("normalizewhitespace", "").lower() == "yes"
        normalizeaccents = term_elem.get("normalizeaccents", "").lower() == "yes"

        # Collect all attributes for reference
        attributes = dict(term_elem.attrib)

        return CheckTerm(
            term_type=term_type,
            pattern=pattern,
            searchmode=searchmode,
            powersearch=powersearch,
            wholeword=wholeword,
            casecheck=casecheck,
            notrim=notrim,
            normalizewhitespace=normalizewhitespace,
            normalizeaccents=normalizeaccents,
            attributes=attributes,
        )

    def _determine_check_type(self, categories: str) -> CheckType:
        """Determine check type from category string."""
        categories_lower = categories.lower()

        if "terminology" in categories_lower:
            return CheckType.TERMINOLOGY
        elif "punctuation" in categories_lower:
            return CheckType.PUNCTUATION
        elif "style" in categories_lower:
            return CheckType.STYLE
        elif "spelling" in categories_lower:
            return CheckType.SPELLING
        elif "grammar" in categories_lower:
            return CheckType.GRAMMAR
        elif "abbreviation" in categories_lower or "acronym" in categories_lower:
            return CheckType.ABBREVIATION
        elif "consistency" in categories_lower or "inconsist" in categories_lower:
            return CheckType.CONSISTENCY
        elif "dnt" in categories_lower or "do not translate" in categories_lower:
            return CheckType.DNT
        else:
            return CheckType.CUSTOM
