"""
Comprehensive QA Checker with strict rules to avoid false positives.

Implements 10 categories of quality checks:
1. Untranslated segments
2. Tag mismatches
3. Number mismatches
4. URL/Email mismatches
5. Double blanks
6. Unpaired symbols
7. Alphanumeric mismatches
8. Case mismatches
9. Inconsistencies
10. Terminology checks
"""

import re
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
from collections import defaultdict


class CheckType(str, Enum):
    """QA check categories."""
    UNTRANSLATED = "untranslated"
    TAG_MISMATCH = "tag_mismatch"
    NUMBER_MISMATCH = "number_mismatch"
    URL_MISMATCH = "url_mismatch"
    DOUBLE_BLANK = "double_blank"
    UNPAIRED_SYMBOLS = "unpaired_symbols"
    ALPHANUMERIC_MISMATCH = "alphanumeric_mismatch"
    CASE_MISMATCH = "case_mismatch"
    INCONSISTENCY = "inconsistency"
    TERMINOLOGY_MISMATCH = "terminology_mismatch"


@dataclass
class QAIssue:
    """QA issue report."""
    segment_id: str
    check_type: str
    severity: str  # "error", "warning", "info"
    message: str
    source_text: str
    target_text: str
    details: Optional[Dict] = None


class UntranslatedChecker:
    """Check for untranslated segments (Source == Target)."""

    MIN_LENGTH = 3
    # Patterns that don't require translation
    NO_TRANSLATE_PATTERN = re.compile(r"^[0-9]*\.?[0-9]+$|^[A-Z]+$|^[^@]*@[^@]+\.[^@]+$|^https?://|^www\.")

    @staticmethod
    def check(source_text: str, target_text: str, segment_id: str) -> Optional[QAIssue]:
        """Check if segment is untranslated."""
        source = source_text.strip()
        target = target_text.strip()

        # Skip if shorter than min length
        if len(source) < UntranslatedChecker.MIN_LENGTH:
            return None

        # Skip if it's only numbers, proper nouns, emails, or URLs
        if UntranslatedChecker.NO_TRANSLATE_PATTERN.match(source):
            return None

        # Check if source equals target
        if source == target:
            return QAIssue(
                segment_id=segment_id,
                check_type=CheckType.UNTRANSLATED,
                severity="error",
                message="Segment appears to be untranslated",
                source_text=source,
                target_text=target,
                details={
                    "reason": "Source text identical to target text"
                }
            )

        return None


class TagMismatchChecker:
    """Check for mismatched tags between source and target."""

    # Pattern to extract tags: <...>, {...}, [...], etc.
    TAG_PATTERN = re.compile(r"<[^>]+>|\{[^}]+\}|\[[^\]]+\]")

    @staticmethod
    def extract_tags(text: str) -> List[str]:
        """Extract all tags from text."""
        return TagMismatchChecker.TAG_PATTERN.findall(text)

    @staticmethod
    def normalize_tags(tags: List[str]) -> List[str]:
        """Normalize tag list for comparison."""
        # Remove duplicates but preserve order
        seen = set()
        normalized = []
        for tag in tags:
            if tag not in seen:
                normalized.append(tag)
                seen.add(tag)
        return sorted(normalized)  # Sort for comparison

    @staticmethod
    def check(source_text: str, target_text: str, segment_id: str) -> Optional[QAIssue]:
        """Check if tags match between source and target."""
        source_tags = TagMismatchChecker.extract_tags(source_text)
        target_tags = TagMismatchChecker.extract_tags(target_text)

        if not source_tags and not target_tags:
            return None

        # Normalize for comparison
        source_normalized = TagMismatchChecker.normalize_tags(source_tags)
        target_normalized = TagMismatchChecker.normalize_tags(target_tags)

        if source_normalized != target_normalized:
            return QAIssue(
                segment_id=segment_id,
                check_type=CheckType.TAG_MISMATCH,
                severity="error",
                message="Tag mismatch between source and target",
                source_text=source_text,
                target_text=target_text,
                details={
                    "source_tags": source_normalized,
                    "target_tags": target_normalized,
                    "missing_in_target": list(set(source_normalized) - set(target_normalized)),
                    "extra_in_target": list(set(target_normalized) - set(source_normalized))
                }
            )

        return None


class NumberMismatchChecker:
    """Check for number mismatches with locale-aware normalization."""

    # Extract numbers: 1, 1.5, 1,000.50, 1.000,50, etc.
    NUMBER_PATTERN = re.compile(r"\d+([.,]\d+)*")

    @staticmethod
    def normalize_number(num_str: str) -> float:
        """Normalize number to float, handling locale differences."""
        # Replace comma with dot if it looks like decimal separator
        # "1,000.50" -> 1000.50, "1.000,50" -> 1000.50
        if "," in num_str and "." in num_str:
            # Both present - use last occurrence as decimal
            last_sep = max(num_str.rfind(","), num_str.rfind("."))
            last_char = num_str[last_sep]
            if last_char == ",":
                num_str = num_str.replace(".", "").replace(",", ".")
            else:
                num_str = num_str.replace(",", "")
        elif "," in num_str:
            # Only comma - could be decimal or thousands
            # If more than 3 digits after comma, it's thousands separator
            parts = num_str.split(",")
            if len(parts[-1]) > 3:
                num_str = num_str.replace(",", "")
            else:
                num_str = num_str.replace(",", ".")

        return float(num_str)

    @staticmethod
    def extract_numbers(text: str) -> Set[float]:
        """Extract and normalize all numbers from text."""
        matches = NumberMismatchChecker.NUMBER_PATTERN.findall(text)
        numbers = set()

        for match in matches:
            try:
                # Reconstruct full number
                full_num = match
                if isinstance(match, tuple):
                    full_num = match[0]
                normalized = NumberMismatchChecker.normalize_number(full_num)
                numbers.add(normalized)
            except (ValueError, AttributeError):
                continue

        return numbers

    @staticmethod
    def check(source_text: str, target_text: str, segment_id: str) -> Optional[QAIssue]:
        """Check if numbers match between source and target."""
        source_numbers = NumberMismatchChecker.extract_numbers(source_text)
        target_numbers = NumberMismatchChecker.extract_numbers(target_text)

        if not source_numbers:
            return None

        if source_numbers != target_numbers:
            return QAIssue(
                segment_id=segment_id,
                check_type=CheckType.NUMBER_MISMATCH,
                severity="error",
                message="Number mismatch between source and target",
                source_text=source_text,
                target_text=target_text,
                details={
                    "source_numbers": sorted(list(source_numbers)),
                    "target_numbers": sorted(list(target_numbers)),
                    "missing": sorted(list(source_numbers - target_numbers)),
                    "extra": sorted(list(target_numbers - source_numbers))
                }
            )

        return None


class URLEmailMismatchChecker:
    """Check for URL/Email mismatches."""

    # Email pattern
    EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

    # URL pattern
    URL_PATTERN = re.compile(
        r"https?://[^\s<>\"{}|\\^`\[\]]+"
    )

    @staticmethod
    def extract_emails(text: str) -> Set[str]:
        """Extract all emails from text."""
        return set(m.lower() for m in URLEmailMismatchChecker.EMAIL_PATTERN.findall(text))

    @staticmethod
    def extract_urls(text: str) -> Set[str]:
        """Extract all URLs from text."""
        return set(URLEmailMismatchChecker.URL_PATTERN.findall(text))

    @staticmethod
    def check(source_text: str, target_text: str, segment_id: str) -> Optional[QAIssue]:
        """Check if URLs and emails match."""
        source_emails = URLEmailMismatchChecker.extract_emails(source_text)
        source_urls = URLEmailMismatchChecker.extract_urls(source_text)
        target_emails = URLEmailMismatchChecker.extract_emails(target_text)
        target_urls = URLEmailMismatchChecker.extract_urls(target_text)

        if not source_emails and not source_urls:
            return None

        if source_emails != target_emails or source_urls != target_urls:
            missing_emails = source_emails - target_emails
            missing_urls = source_urls - target_urls
            extra_emails = target_emails - source_emails
            extra_urls = target_urls - source_urls

            issues = []
            if missing_emails:
                issues.append(f"Missing emails: {missing_emails}")
            if missing_urls:
                issues.append(f"Missing URLs: {missing_urls}")
            if extra_emails:
                issues.append(f"Extra emails: {extra_emails}")
            if extra_urls:
                issues.append(f"Extra URLs: {extra_urls}")

            return QAIssue(
                segment_id=segment_id,
                check_type=CheckType.URL_MISMATCH,
                severity="error",
                message="URL/Email mismatch between source and target",
                source_text=source_text,
                target_text=target_text,
                details={
                    "source_emails": list(source_emails),
                    "target_emails": list(target_emails),
                    "source_urls": list(source_urls),
                    "target_urls": list(target_urls),
                    "issues": issues
                }
            )

        return None


class DoubleBlankChecker:
    """Check for double spaces in target text."""

    DOUBLE_BLANK_PATTERN = re.compile(r"\s{2,}")

    @staticmethod
    def check(source_text: str, target_text: str, segment_id: str) -> Optional[QAIssue]:
        """Check for double blanks in target."""
        # If source also has double blanks, it's intentional
        if DoubleBlankChecker.DOUBLE_BLANK_PATTERN.search(source_text):
            return None

        if DoubleBlankChecker.DOUBLE_BLANK_PATTERN.search(target_text):
            return QAIssue(
                segment_id=segment_id,
                check_type=CheckType.DOUBLE_BLANK,
                severity="warning",
                message="Double spaces found in target text",
                source_text=source_text,
                target_text=target_text,
                details={
                    "positions": [m.start() for m in DoubleBlankChecker.DOUBLE_BLANK_PATTERN.finditer(target_text)]
                }
            )

        return None


class UnpairedSymbolChecker:
    """Check for unpaired brackets, parentheses, quotes."""

    SYMBOL_PAIRS = {
        "(": ")",
        "[": "]",
        "{": "}",
        '"': '"',
        "'": "'"
    }

    @staticmethod
    def check(source_text: str, target_text: str, segment_id: str) -> Optional[QAIssue]:
        """Check for unpaired symbols in target."""
        issues = []

        # Check parentheses
        if target_text.count("(") != target_text.count(")"):
            issues.append(f"Parentheses mismatch: ( count={target_text.count('(')}, ) count={target_text.count(')')}")

        # Check square brackets
        if target_text.count("[") != target_text.count("]"):
            issues.append(f"Square brackets mismatch: [ count={target_text.count('[')}, ] count={target_text.count(']')}")

        # Check curly braces
        if target_text.count("{") != target_text.count("}"):
            issues.append(f"Curly braces mismatch: {{ count={target_text.count('{')}, }} count={target_text.count('}')}")

        # Check double quotes
        if target_text.count('"') % 2 != 0:
            issues.append(f"Unclosed double quotes: count={target_text.count('\"')}")

        if issues:
            return QAIssue(
                segment_id=segment_id,
                check_type=CheckType.UNPAIRED_SYMBOLS,
                severity="error",
                message="Unpaired symbols found in target text",
                source_text=source_text,
                target_text=target_text,
                details={"issues": issues}
            )

        return None


class AlphanumericMismatchChecker:
    """Check for alphanumeric codes (A-123, X99) mismatches."""

    # Pattern for codes like A-123, X99, ABC-DEF-123
    CODE_PATTERN = re.compile(r"\b[A-Z][A-Z0-9]*[-_]?[0-9]+\b|\b[A-Z]{2,}-?[0-9]+\b")

    @staticmethod
    def extract_codes(text: str) -> Set[str]:
        """Extract alphanumeric codes from text."""
        matches = AlphanumericMismatchChecker.CODE_PATTERN.findall(text)
        return set(m.upper() for m in matches)

    @staticmethod
    def check(source_text: str, target_text: str, segment_id: str) -> Optional[QAIssue]:
        """Check if alphanumeric codes are preserved in target."""
        source_codes = AlphanumericMismatchChecker.extract_codes(source_text)
        target_codes = AlphanumericMismatchChecker.extract_codes(target_text)

        if not source_codes:
            return None

        missing = source_codes - target_codes

        if missing:
            return QAIssue(
                segment_id=segment_id,
                check_type=CheckType.ALPHANUMERIC_MISMATCH,
                severity="warning",
                message="Alphanumeric codes missing or mismatched in target",
                source_text=source_text,
                target_text=target_text,
                details={
                    "source_codes": sorted(list(source_codes)),
                    "target_codes": sorted(list(target_codes)),
                    "missing": sorted(list(missing))
                }
            )

        return None


class CaseMismatchChecker:
    """Check for CamelCase and UPPERCASE preservation."""

    # CamelCase pattern (iPad, PayPal, iPhone)
    CAMELCASE_PATTERN = re.compile(r"\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b")

    # UPPERCASE pattern (WARNING, ISO, HTTP)
    UPPERCASE_PATTERN = re.compile(r"\b[A-Z]{2,}\b")

    @staticmethod
    def extract_camelcase(text: str) -> Set[str]:
        """Extract CamelCase words."""
        return set(CaseMismatchChecker.CAMELCASE_PATTERN.findall(text))

    @staticmethod
    def extract_uppercase(text: str) -> Set[str]:
        """Extract UPPERCASE words."""
        return set(CaseMismatchChecker.UPPERCASE_PATTERN.findall(text))

    @staticmethod
    def check(source_text: str, target_text: str, segment_id: str) -> Optional[QAIssue]:
        """Check for case mismatches."""
        source_camel = CaseMismatchChecker.extract_camelcase(source_text)
        source_upper = CaseMismatchChecker.extract_uppercase(source_text)
        target_camel = CaseMismatchChecker.extract_camelcase(target_text)
        target_upper = CaseMismatchChecker.extract_uppercase(target_text)

        issues = []

        # Check CamelCase
        missing_camel = source_camel - target_camel
        if missing_camel:
            issues.append(f"Missing CamelCase: {missing_camel}")

        # Check UPPERCASE
        missing_upper = source_upper - target_upper
        if missing_upper:
            issues.append(f"Missing UPPERCASE: {missing_upper}")

        if issues:
            return QAIssue(
                segment_id=segment_id,
                check_type=CheckType.CASE_MISMATCH,
                severity="warning",
                message="Case mismatch (CamelCase/UPPERCASE) in target text",
                source_text=source_text,
                target_text=target_text,
                details={"issues": issues}
            )

        return None


class InconsistencyChecker:
    """Check for inconsistent translations."""

    def __init__(self):
        """Initialize inconsistency tracker."""
        self.source_to_targets: Dict[str, Set[str]] = defaultdict(set)
        self.target_to_sources: Dict[str, Set[str]] = defaultdict(set)

    def add_segment(self, source_text: str, target_text: str):
        """Add segment to tracking."""
        source = source_text.strip().lower()
        target = target_text.strip().lower()

        if source and target:
            self.source_to_targets[source].add(target)
            self.target_to_sources[target].add(source)

    def check_all(self, segments_data: List[Dict]) -> List[QAIssue]:
        """Check all inconsistencies."""
        issues = []

        # Type A: Multiple translations for same source
        for source, targets in self.source_to_targets.items():
            if len(targets) > 1:
                # Find first segment with this inconsistency
                for seg in segments_data:
                    if seg["source_text"].strip().lower() == source:
                        issues.append(QAIssue(
                            segment_id=seg["segment_id"],
                            check_type=CheckType.INCONSISTENCY,
                            severity="warning",
                            message="Multiple translations found for same source text",
                            source_text=seg["source_text"],
                            target_text=seg["target_text"],
                            details={
                                "type": "multiple_targets",
                                "source": source,
                                "targets": sorted(list(targets))
                            }
                        ))
                        break

        # Type B: Multiple sources for same target
        for target, sources in self.target_to_sources.items():
            if len(sources) > 1:
                # Find first segment with this inconsistency
                for seg in segments_data:
                    if seg["target_text"].strip().lower() == target:
                        issues.append(QAIssue(
                            segment_id=seg["segment_id"],
                            check_type=CheckType.INCONSISTENCY,
                            severity="info",
                            message="Same target used for multiple sources (possible synonym usage)",
                            source_text=seg["source_text"],
                            target_text=seg["target_text"],
                            details={
                                "type": "multiple_sources",
                                "target": target,
                                "sources": sorted(list(sources))
                            }
                        ))
                        break

        return issues


class TerminologyChecker:
    """Check terminology consistency using a glossary/termbase."""

    def __init__(self, glossary: Optional[Dict[str, str]] = None):
        """
        Initialize with optional glossary.

        Args:
            glossary: Dict mapping source terms to target terms.
                     Example: {"API": "API", "User Interface": "Interfaz de Usuario"}
        """
        self.glossary = glossary or {}
        # Normalize glossary keys to lowercase for case-insensitive matching
        self.glossary_lower = {k.lower(): v for k, v in self.glossary.items()}

    def check(self, source_text: str, target_text: str, segment_id: str) -> Optional[QAIssue]:
        """Check if glossary terms are properly translated."""
        if not self.glossary_lower:
            return None

        issues = []
        source_lower = source_text.lower()
        target_lower = target_text.lower()

        for source_term, target_term in self.glossary_lower.items():
            # Check if source term appears in source text
            if re.search(r"\b" + re.escape(source_term) + r"\b", source_lower):
                # Check if target term appears in target text
                if not re.search(r"\b" + re.escape(target_term.lower()) + r"\b", target_lower):
                    issues.append({
                        "source_term": source_term,
                        "expected_target": target_term,
                        "issue": "Expected target term not found"
                    })

        if issues:
            return QAIssue(
                segment_id=segment_id,
                check_type=CheckType.TERMINOLOGY_MISMATCH,
                severity="warning",
                message="Terminology mismatch in target text",
                source_text=source_text,
                target_text=target_text,
                details={
                    "missing_terms": issues
                }
            )

        return None


class ComprehensiveQAChecker:
    """Main comprehensive QA checker combining all checks."""

    def __init__(self, glossary: Optional[Dict[str, str]] = None):
        """
        Initialize QA checker.

        Args:
            glossary: Optional glossary for terminology checks.
        """
        self.terminology_checker = TerminologyChecker(glossary)
        self.inconsistency_checker = InconsistencyChecker()

    def check_segment(self, source_text: str, target_text: str, segment_id: str) -> List[QAIssue]:
        """Check a single segment for all issue types."""
        issues = []

        # Run individual checks
        checks = [
            UntranslatedChecker.check(source_text, target_text, segment_id),
            TagMismatchChecker.check(source_text, target_text, segment_id),
            NumberMismatchChecker.check(source_text, target_text, segment_id),
            URLEmailMismatchChecker.check(source_text, target_text, segment_id),
            DoubleBlankChecker.check(source_text, target_text, segment_id),
            UnpairedSymbolChecker.check(source_text, target_text, segment_id),
            AlphanumericMismatchChecker.check(source_text, target_text, segment_id),
            CaseMismatchChecker.check(source_text, target_text, segment_id),
            self.terminology_checker.check(source_text, target_text, segment_id),
        ]

        for check_result in checks:
            if check_result:
                issues.append(check_result)

        return issues

    def check_segments(self, segments: List[Dict]) -> List[QAIssue]:
        """
        Check multiple segments for all issues.

        Args:
            segments: List of dicts with keys: segment_id, source_text, target_text

        Returns:
            List of QAIssue objects
        """
        all_issues = []

        # First pass: individual segment checks
        for segment in segments:
            segment_issues = self.check_segment(
                segment.get("source_text", ""),
                segment.get("target_text", ""),
                segment.get("segment_id", "")
            )
            all_issues.extend(segment_issues)

            # Track for inconsistency check
            self.inconsistency_checker.add_segment(
                segment.get("source_text", ""),
                segment.get("target_text", "")
            )

        # Second pass: inconsistency checks (need all segments)
        inconsistency_issues = self.inconsistency_checker.check_all(segments)
        all_issues.extend(inconsistency_issues)

        return all_issues
