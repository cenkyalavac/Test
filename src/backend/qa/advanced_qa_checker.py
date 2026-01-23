"""
Advanced QA Engine for Translation Quality Assurance.

Provides comprehensive checks for translation quality including:
- Untranslated segments
- Consistency checks
- Tag/symbol/quote validation
- Terminology validation
- Pattern matching
- And 16+ other quality metrics
"""

import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Set, Tuple, Callable
from enum import Enum

from ..parser.models import Segment, SegmentStatus
from .checklist_model import Checklist, CheckRule

try:
    from .spell_checker import (
        MultiLanguageSpellChecker, SupportedLanguage, SpellingError,
        SPELLCHECKER_AVAILABLE
    )
except ImportError:
    SPELLCHECKER_AVAILABLE = False
    MultiLanguageSpellChecker = None
    SupportedLanguage = None


class QACheckType(str, Enum):
    """Comprehensive QA check types."""
    UNTRANSLATED = "untranslated"
    INCONSISTENT_TRANSLATION = "inconsistent_translation"
    INVERSE_INCONSISTENT = "inverse_inconsistent"
    SOURCE_EQUALS_TARGET = "source_equals_target"
    TAG_MISMATCH = "tag_mismatch"
    NUMBER_MISMATCH = "number_mismatch"
    URL_EMAIL_MISMATCH = "url_email_mismatch"
    ALPHANUMERIC_MISMATCH = "alphanumeric_mismatch"
    UNPAIRED_SYMBOLS = "unpaired_symbols"
    UNPAIRED_QUOTES = "unpaired_quotes"
    DOUBLE_BLANKS = "double_blanks"
    UPPERCASE_MISMATCH = "uppercase_mismatch"
    CAMELCASE_MISMATCH = "camelcase_mismatch"
    KEY_TERM_MISSING = "key_term_missing"
    CHECKLIST_VIOLATION = "checklist_violation"
    SPELLING_ERROR = "spelling_error"


@dataclass
class AdvancedQAIssue:
    """Represents a QA issue found during validation."""

    segment_id: str
    check_type: QACheckType
    severity: str  # "error", "warning", "info"
    message: str
    source_text: Optional[str] = None
    target_text: Optional[str] = None
    details: Dict = field(default_factory=dict)

    def __str__(self) -> str:
        return f"[{self.severity.upper()}] {self.segment_id}: {self.message}"


class AdvancedQAChecker:
    """
    Advanced Translation QA Engine.

    Performs comprehensive quality checks on translation segments.
    """

    def __init__(self):
        """Initialize QA checker."""
        self.issues: List[AdvancedQAIssue] = []
        self.checklists: List[Checklist] = []
        self.glossary: Dict[str, Set[str]] = {}  # term -> correct translations
        self.segment_index: Dict[str, Segment] = {}  # For consistency checks
        self.spell_checkers: Dict[str, MultiLanguageSpellChecker] = {}  # Language -> checker
        self.spell_check_enabled = SPELLCHECKER_AVAILABLE

    def check_segments(self, segments: List[Segment], skip_consistency: bool = False) -> List[AdvancedQAIssue]:
        """
        Perform all QA checks on segments.

        Args:
            segments: List of segments to check
            skip_consistency: Skip expensive consistency checks (for fast mode)

        Returns:
            List of QA issues found
        """
        self.issues = []
        self.segment_index = {seg.segment_id: seg for seg in segments}

        for segment in segments:
            self._check_single_segment(segment)

        # Cross-segment checks (consistency, etc.) - skip in fast mode
        if not skip_consistency and len(segments) <= 500:
            self._check_consistency_across_segments(segments)

        return self.issues

    def _check_single_segment(self, segment: Segment) -> None:
        """Perform all checks on a single segment."""
        # 1. Untranslated
        if self._check_untranslated(segment):
            return

        # 2. Source equals target
        self._check_source_equals_target(segment)

        # 3. Tag mismatches
        self._check_tag_mismatches(segment)

        # 4. Number mismatches
        self._check_number_mismatches(segment)

        # 5. URL/Email mismatches
        self._check_url_email_mismatches(segment)

        # 6. Alphanumeric mismatches
        self._check_alphanumeric_mismatches(segment)

        # 7. Unpaired symbols
        self._check_unpaired_symbols(segment)

        # 8. Unpaired quotes
        self._check_unpaired_quotes(segment)

        # 9. Double blanks
        self._check_double_blanks(segment)

        # 10. UPPERCASE mismatches
        self._check_uppercase_mismatch(segment)

        # 11. CamelCase mismatches
        self._check_camelcase_mismatch(segment)

        # 12. Key term checks
        self._check_key_terms(segment)

        # 13. Checklist validation
        self._check_against_checklists(segment)

        # 14. Spell checking (if available)
        if self.spell_check_enabled:
            self._check_spelling(segment)

    def _check_untranslated(self, segment: Segment) -> bool:
        """Check for untranslated segments."""
        if not segment.target_text or not segment.target_text.strip():
            if segment.source_text and segment.source_text.strip():
                self.issues.append(
                    AdvancedQAIssue(
                        segment_id=segment.segment_id,
                        check_type=QACheckType.UNTRANSLATED,
                        severity="error",
                        message="Segment is not translated",
                        source_text=segment.source_text,
                        target_text=segment.target_text,
                    )
                )
                return True
        return False

    def _check_source_equals_target(self, segment: Segment) -> None:
        """Check if source and target are identical."""
        source = segment.source_text.strip()
        target = segment.target_text.strip()

        if source and target and source == target:
            self.issues.append(
                AdvancedQAIssue(
                    segment_id=segment.segment_id,
                    check_type=QACheckType.SOURCE_EQUALS_TARGET,
                    severity="warning",
                    message="Target text matches source text exactly",
                    source_text=source,
                    target_text=target,
                )
            )

    def _check_tag_mismatches(self, segment: Segment) -> None:
        """Check for inline tag count mismatches."""
        source_count = len(segment.source_inline_tags)
        target_count = len(segment.target_inline_tags)

        if source_count > 0 and source_count != target_count:
            self.issues.append(
                AdvancedQAIssue(
                    segment_id=segment.segment_id,
                    check_type=QACheckType.TAG_MISMATCH,
                    severity="error",
                    message=f"Tag mismatch: source={source_count}, target={target_count}",
                    source_text=segment.source_text,
                    target_text=segment.target_text,
                    details={
                        "source_tag_count": source_count,
                        "target_tag_count": target_count,
                    },
                )
            )

    def _check_number_mismatches(self, segment: Segment) -> None:
        """Check for number mismatches between source and target."""
        source_numbers = set(re.findall(r'\d+', segment.source_text))
        target_numbers = set(re.findall(r'\d+', segment.target_text))

        if source_numbers and source_numbers != target_numbers:
            missing = source_numbers - target_numbers
            extra = target_numbers - source_numbers

            self.issues.append(
                AdvancedQAIssue(
                    segment_id=segment.segment_id,
                    check_type=QACheckType.NUMBER_MISMATCH,
                    severity="error",
                    message=f"Number mismatch: missing {missing}, extra {extra}",
                    source_text=segment.source_text,
                    target_text=segment.target_text,
                    details={"missing": list(missing), "extra": list(extra)},
                )
            )

    def _check_url_email_mismatches(self, segment: Segment) -> None:
        """Check for URL and email mismatches."""
        url_pattern = r'https?://[^\s]+'
        email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'

        source_urls = set(re.findall(url_pattern, segment.source_text))
        target_urls = set(re.findall(url_pattern, segment.target_text))

        source_emails = set(re.findall(email_pattern, segment.source_text))
        target_emails = set(re.findall(email_pattern, segment.target_text))

        # Check URLs
        if source_urls and source_urls != target_urls:
            self.issues.append(
                AdvancedQAIssue(
                    segment_id=segment.segment_id,
                    check_type=QACheckType.URL_EMAIL_MISMATCH,
                    severity="error",
                    message=f"URL mismatch: {source_urls - target_urls}",
                    source_text=segment.source_text,
                    target_text=segment.target_text,
                    details={"type": "url"},
                )
            )

        # Check emails
        if source_emails and source_emails != target_emails:
            self.issues.append(
                AdvancedQAIssue(
                    segment_id=segment.segment_id,
                    check_type=QACheckType.URL_EMAIL_MISMATCH,
                    severity="error",
                    message=f"Email mismatch: {source_emails - target_emails}",
                    source_text=segment.source_text,
                    target_text=segment.target_text,
                    details={"type": "email"},
                )
            )

    def _check_alphanumeric_mismatches(self, segment: Segment) -> None:
        """
        Check for numeric and code mismatches ONLY.

        CRITICAL: Only match actual numbers and uppercase alphanumeric codes.
        Do NOT match normal words (like 'Lasten', 'entfernen').

        Pattern matches:
        - Plain numbers: 123, 2.5, 1.000,50 (with locale separators)
        - Uppercase codes: K005, ABC123, Version2x (must start uppercase)

        Does NOT match:
        - Regular words with mixed case
        - Lowercase only words
        """
        # Extract ONLY numbers and uppercase codes like "K005", "V2.1", etc.
        # This pattern matches:
        # 1. Numbers (with optional dots/commas): \d+(?:[.,]\d+)*
        # 2. Uppercase alphanum codes: [A-Z]+\d+[A-Z0-9]*
        pattern = r'(?:\d+(?:[.,]\d+)*|[A-Z]+\d+[A-Z0-9]*)'

        source_matches = set(re.findall(pattern, segment.source_text))
        target_matches = set(re.findall(pattern, segment.target_text))

        if source_matches and source_matches != target_matches:
            missing = source_matches - target_matches

            # Filter out language code changes (e.g., ".de" vs ".tr")
            filtered_missing = set()
            for item in missing:
                # Check if it's a language code pattern like ".de", ".fr", ".tr", etc.
                if re.match(r'^\.[a-z]{2}$', item):
                    # This is a language code - check if target has ANY language code
                    lang_code_pattern = r'\.[a-z]{2}'
                    if re.search(lang_code_pattern, ' '.join(target_matches)):
                        # Target has a language code, so this is a legitimate change
                        continue
                filtered_missing.add(item)

            if filtered_missing:
                self.issues.append(
                    AdvancedQAIssue(
                        segment_id=segment.segment_id,
                        check_type=QACheckType.ALPHANUMERIC_MISMATCH,
                        severity="warning",
                        message=f"Alphanumeric mismatch: missing {filtered_missing}",
                        source_text=segment.source_text,
                        target_text=segment.target_text,
                        details={"missing": list(filtered_missing)},
                    )
                )

    def _check_unpaired_symbols(self, segment: Segment) -> None:
        """Check for unpaired parentheses, brackets, braces."""
        symbols = {'(': ')', '[': ']', '{': '}'}

        for open_sym, close_sym in symbols.items():
            source_open = segment.source_text.count(open_sym)
            source_close = segment.source_text.count(close_sym)
            target_open = segment.target_text.count(open_sym)
            target_close = segment.target_text.count(close_sym)

            # Check if counts match
            if source_open != source_close or target_open != target_close:
                self.issues.append(
                    AdvancedQAIssue(
                        segment_id=segment.segment_id,
                        check_type=QACheckType.UNPAIRED_SYMBOLS,
                        severity="error",
                        message=f"Unpaired {open_sym}/{close_sym}: source unpaired={source_open != source_close}, target unpaired={target_open != target_close}",
                        source_text=segment.source_text,
                        target_text=segment.target_text,
                        details={
                            "symbol": f"{open_sym}/{close_sym}",
                            "source_open": source_open,
                            "source_close": source_close,
                        },
                    )
                )

    def _check_unpaired_quotes(self, segment: Segment) -> None:
        """
        Check for unpaired quotation marks.

        CRITICAL: Only check actual quote characters.
        Do NOT check commas, periods, or other punctuation.

        Supported quotes:
        - Straight quotes: " (double), ' (single)
        - Curly quotes: " " (left/right double), ' ' (left/right single)
        - Angle quotes: « » (guillemets)

        EXCLUDED: Comma (,) is NEVER a quote character!
        """
        # ONLY quotation marks - NO commas, NO other punctuation
        quote_types = [
            '"',   # Straight double quote
            "'",   # Straight single quote / apostrophe
            '"',   # Left double quotation mark (curly)
            '"',   # Right double quotation mark (curly)
            ''',   # Left single quotation mark (curly)
            ''',   # Right single quotation mark (curly)
            '«',   # Left-pointing double angle quotation mark
            '»',   # Right-pointing double angle quotation mark
        ]

        for quote in quote_types:
            source_count = segment.source_text.count(quote)
            target_count = segment.target_text.count(quote)

            if source_count % 2 != 0 or target_count % 2 != 0:
                self.issues.append(
                    AdvancedQAIssue(
                        segment_id=segment.segment_id,
                        check_type=QACheckType.UNPAIRED_QUOTES,
                        severity="warning",
                        message=f"Unpaired quote: source={source_count}, target={target_count}",
                        source_text=segment.source_text,
                        target_text=segment.target_text,
                        details={"quote_char": repr(quote), "source_count": source_count, "target_count": target_count},
                    )
                )

    def _check_double_blanks(self, segment: Segment) -> None:
        """Check for double spaces or multiple blanks."""
        if "  " in segment.target_text:
            self.issues.append(
                AdvancedQAIssue(
                    segment_id=segment.segment_id,
                    check_type=QACheckType.DOUBLE_BLANKS,
                    severity="warning",
                    message="Target contains double or multiple spaces",
                    source_text=segment.source_text,
                    target_text=segment.target_text,
                )
            )

    def _check_uppercase_mismatch(self, segment: Segment) -> None:
        """Check for UPPERCASE word count mismatches."""
        source_uppercase = set(re.findall(r'\b[A-Z]{2,}\b', segment.source_text))
        target_uppercase = set(re.findall(r'\b[A-Z]{2,}\b', segment.target_text))

        if source_uppercase and source_uppercase != target_uppercase:
            missing = source_uppercase - target_uppercase
            if missing:
                self.issues.append(
                    AdvancedQAIssue(
                        segment_id=segment.segment_id,
                        check_type=QACheckType.UPPERCASE_MISMATCH,
                        severity="warning",
                        message=f"UPPERCASE words mismatch: missing {missing}",
                        source_text=segment.source_text,
                        target_text=segment.target_text,
                        details={"missing": list(missing)},
                    )
                )

    def _check_camelcase_mismatch(self, segment: Segment) -> None:
        """Check for CamelCase word mismatches."""
        # CamelCase: starts with letter, has uppercase in middle
        camelcase_pattern = r'\b[a-z][a-zA-Z]*[A-Z][a-zA-Z]*\b'

        source_camelcase = set(re.findall(camelcase_pattern, segment.source_text))
        target_camelcase = set(re.findall(camelcase_pattern, segment.target_text))

        if source_camelcase and source_camelcase != target_camelcase:
            missing = source_camelcase - target_camelcase
            if missing:
                self.issues.append(
                    AdvancedQAIssue(
                        segment_id=segment.segment_id,
                        check_type=QACheckType.CAMELCASE_MISMATCH,
                        severity="info",
                        message=f"CamelCase words mismatch: missing {missing}",
                        source_text=segment.source_text,
                        target_text=segment.target_text,
                        details={"missing": list(missing)},
                    )
                )

    def _check_key_terms(self, segment: Segment) -> None:
        """Check for missing key terms from glossary."""
        for term, correct_forms in self.glossary.items():
            if term.lower() in segment.source_text.lower():
                # Term appears in source, check if properly translated
                found = any(form.lower() in segment.target_text.lower()
                           for form in correct_forms)

                if not found:
                    self.issues.append(
                        AdvancedQAIssue(
                            segment_id=segment.segment_id,
                            check_type=QACheckType.KEY_TERM_MISSING,
                            severity="warning",
                            message=f"Key term '{term}' not properly translated",
                            source_text=segment.source_text,
                            target_text=segment.target_text,
                            details={
                                "term": term,
                                "expected": list(correct_forms),
                            },
                        )
                    )

    def _check_against_checklists(self, segment: Segment) -> None:
        """Check segment against all loaded checklists."""
        for checklist in self.checklists:
            for rule in checklist.get_active_rules():
                if not rule.validate_segment(segment.source_text, segment.target_text):
                    self.issues.append(
                        AdvancedQAIssue(
                            segment_id=segment.segment_id,
                            check_type=QACheckType.CHECKLIST_VIOLATION,
                            severity="warning",
                            message=f"[{checklist.name}] {rule.description or rule.name}",
                            source_text=segment.source_text,
                            target_text=segment.target_text,
                            details={
                                "checklist": checklist.name,
                                "rule": rule.name,
                                "category": rule.category,
                            },
                        )
                    )

    def _check_consistency_across_segments(self, segments: List[Segment]) -> None:
        """Check for consistency issues across multiple segments."""
        # Build translation memory
        source_to_targets: Dict[str, Set[str]] = defaultdict(set)
        target_to_sources: Dict[str, Set[str]] = defaultdict(set)

        for segment in segments:
            source = segment.source_text.strip()
            target = segment.target_text.strip()

            if source and target:
                source_to_targets[source].add(target)
                target_to_sources[target].add(source)

        # Check for inconsistencies
        for segment in segments:
            source = segment.source_text.strip()
            target = segment.target_text.strip()

            if not source or not target:
                continue

            # Same source, different targets
            if len(source_to_targets[source]) > 1:
                other_targets = source_to_targets[source] - {target}
                self.issues.append(
                    AdvancedQAIssue(
                        segment_id=segment.segment_id,
                        check_type=QACheckType.INCONSISTENT_TRANSLATION,
                        severity="warning",
                        message=f"Inconsistent translation: source '{source}' translated as '{other_targets}'",
                        source_text=source,
                        target_text=target,
                        details={"other_translations": list(other_targets)},
                    )
                )

            # Same target, different sources
            if len(target_to_sources[target]) > 1:
                other_sources = target_to_sources[target] - {source}
                self.issues.append(
                    AdvancedQAIssue(
                        segment_id=segment.segment_id,
                        check_type=QACheckType.INVERSE_INCONSISTENT,
                        severity="info",
                        message=f"Target '{target}' used for different sources: {other_sources}",
                        source_text=source,
                        target_text=target,
                        details={"other_sources": list(other_sources)},
                    )
                )

    def _check_spelling(self, segment: Segment) -> None:
        """
        Check for spelling errors in translation target text.

        CRITICAL: For unsupported languages, spell checking is SKIPPED SILENTLY
        instead of falling back to English (which causes false positives).

        Example: Turkish text will NOT be checked with English dictionary.
        Instead, it will be skipped to avoid incorrect suggestions like 'airlike' for 'birlikte'.

        Spell check errors are classified as warnings.
        """
        if not segment.target_text or not segment.target_text.strip():
            return

        try:
            # Extract language code - handle both 'tr' and 'tr-TR' formats
            language_code = segment.target_language or "en"
            language_code = language_code.split('-')[0].lower()  # Convert 'tr-TR' to 'tr'

            # Map language code to SupportedLanguage enum
            lang_map = {
                "en": "ENGLISH", "es": "SPANISH", "fr": "FRENCH",
                "de": "GERMAN", "pt": "PORTUGUESE", "ru": "RUSSIAN",
                "pl": "POLISH", "it": "ITALIAN", "nl": "DUTCH",
                "tr": "TURKISH", "ar": "ARABIC", "el": "GREEK",
                "zh": "CHINESE"
            }

            lang_name = lang_map.get(language_code)

            # If language not in map, skip spell check silently (don't fallback to English!)
            if lang_name is None:
                return

            if lang_name not in self.spell_checkers:
                try:
                    lang_enum = SupportedLanguage[lang_name]
                    self.spell_checkers[lang_name] = MultiLanguageSpellChecker(lang_enum)
                except Exception:
                    # Mark as unsupported - don't fallback to English
                    # This prevents Turkish text from being checked with English dictionary
                    self.spell_checkers[lang_name] = None
                    return

            checker = self.spell_checkers[lang_name]

            # If checker is None (unsupported), skip silently
            if checker is None:
                return

            errors: List[SpellingError] = checker.check_text(segment.target_text)

            for error in errors:
                suggestions_text = ", ".join(error.suggestions[:3]) if error.suggestions else "no suggestions"
                self.issues.append(
                    AdvancedQAIssue(
                        segment_id=segment.segment_id,
                        check_type=QACheckType.SPELLING_ERROR,
                        severity="warning",
                        message=f"Spelling: '{error.word}' → {suggestions_text}",
                        source_text=segment.source_text,
                        target_text=segment.target_text,
                        details={
                            "misspelled_word": error.word,
                            "suggestions": error.suggestions[:5],
                            "position": error.position,
                            "context": error.context
                        }
                    )
                )
        except Exception:
            # Silently skip spell checking on any error
            pass

    def load_checklist(self, checklist: Checklist) -> None:
        """Load a checklist for validation."""
        self.checklists.append(checklist)

    def add_key_term(self, term: str, correct_forms: List[str]) -> None:
        """Add a key term with correct translations."""
        self.glossary[term] = set(correct_forms)

    def get_summary(self) -> Dict:
        """Get summary statistics of found issues."""
        by_type = defaultdict(int)
        by_severity = defaultdict(int)

        for issue in self.issues:
            by_type[issue.check_type.value] += 1
            by_severity[issue.severity] += 1

        return {
            "total_issues": len(self.issues),
            "by_type": dict(by_type),
            "by_severity": dict(by_severity),
            "errors": by_severity.get("error", 0),
            "warnings": by_severity.get("warning", 0),
            "infos": by_severity.get("info", 0),
        }

    def get_issues_by_type(self, check_type: QACheckType) -> List[AdvancedQAIssue]:
        """Get issues filtered by type."""
        return [issue for issue in self.issues if issue.check_type == check_type]

    def get_issues_by_severity(self, severity: str) -> List[AdvancedQAIssue]:
        """Get issues filtered by severity."""
        return [issue for issue in self.issues if issue.severity == severity]
