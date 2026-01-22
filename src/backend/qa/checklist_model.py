"""
Checklist data models for XBench Checklist format support.

Represents terminology rules, checks, and project-specific guidelines
for translation QA validation.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum


class SearchMode(str, Enum):
    """Search pattern matching modes."""
    SIMPLE = "simple"
    REGEXP = "regexp"


class CheckType(str, Enum):
    """Types of QA checks in a checklist."""
    TERMINOLOGY = "Terminology"
    PUNCTUATION = "Punctuation"
    STYLE = "Style"
    SPELLING = "Spelling"
    GRAMMAR = "Grammar"
    ABBREVIATION = "Abbreviations & Acronyms"
    CONSISTENCY = "Consistency"
    FORMATTING = "Formatting"
    DNT = "Do Not Translate"
    CUSTOM = "Custom"


@dataclass
class CheckTerm:
    """Represents a search term in a checklist check."""

    term_type: str  # "source" or "target"
    pattern: str  # The actual pattern to search for
    searchmode: SearchMode = SearchMode.SIMPLE
    powersearch: bool = False  # Match partial words
    wholeword: bool = False  # Match only whole words
    casecheck: bool = False  # Perform case-sensitive matching
    notrim: bool = False  # Do not trim whitespace
    normalizewhitespace: bool = False  # Normalize internal whitespace
    normalizeaccents: bool = False  # Ignore accents in matching
    attributes: Dict[str, Any] = field(default_factory=dict)

    def matches(self, text: str) -> bool:
        """Check if pattern matches text based on search mode."""
        if not text:
            return False

        # Apply normalization
        search_text = text
        pattern = self.pattern

        if self.normalizewhitespace:
            search_text = " ".join(search_text.split())
            pattern = " ".join(pattern.split())

        if self.normalizeaccents:
            import unicodedata
            search_text = "".join(c for c in unicodedata.normalize('NFD', search_text)
                                 if unicodedata.category(c) != 'Mn')
            pattern = "".join(c for c in unicodedata.normalize('NFD', pattern)
                             if unicodedata.category(c) != 'Mn')

        if not self.casecheck:
            search_text = search_text.lower()
            pattern = pattern.lower()

        # Handle negation (pattern starts with -)
        negate = pattern.startswith("-")
        if negate:
            pattern = pattern[1:].lstrip('"\'')

        # Apply search mode
        if self.searchmode == SearchMode.REGEXP:
            import re
            try:
                match = bool(re.search(pattern, search_text))
            except re.error:
                return False
        else:  # SIMPLE
            if self.wholeword:
                import re
                pattern_escaped = re.escape(pattern)
                match = bool(re.search(r'\b' + pattern_escaped + r'\b', search_text))
            else:
                match = pattern in search_text

        # Apply negation
        return not match if negate else match


@dataclass
class CheckRule:
    """Represents a single QA check/rule in a checklist."""

    name: str
    check_type: CheckType
    description: str = ""
    source_term: Optional[CheckTerm] = None
    target_term: Optional[CheckTerm] = None
    category: str = ""
    disabled: bool = False
    timestamp: str = ""

    def validate_segment(self, source_text: str, target_text: str) -> bool:
        """
        Validate if segment passes this check.

        Returns True if segment is OK, False if it violates the rule.
        """
        if self.disabled:
            return True

        # Check source term if present
        if self.source_term:
            if not self.source_term.matches(source_text):
                return True  # Source doesn't match, check doesn't apply

        # If we reach here and target_term exists, check it
        if self.target_term:
            # If source matched, target must match correctly
            return self.target_term.matches(target_text)

        return True  # Validation passed


@dataclass
class Checklist:
    """Represents an XBench checklist with multiple QA rules."""

    name: str
    version: str = "1.1"
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    rules: List[CheckRule] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_active_rules(self) -> List[CheckRule]:
        """Get all enabled rules."""
        return [rule for rule in self.rules if not rule.disabled]

    def get_rules_by_category(self, category: str) -> List[CheckRule]:
        """Get rules by category."""
        return [rule for rule in self.rules if rule.category == category]

    def get_rules_by_type(self, check_type: CheckType) -> List[CheckRule]:
        """Get rules by check type."""
        return [rule for rule in self.rules if rule.check_type == check_type]

    def rule_count(self) -> int:
        """Total number of rules."""
        return len(self.rules)

    def active_rule_count(self) -> int:
        """Number of enabled rules."""
        return len(self.get_active_rules())
