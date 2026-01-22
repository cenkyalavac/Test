"""
MQM (Multidimensional Quality Metrics) Typology for Translation Errors

Defines error categories, severity levels, and classification system
based on industry-standard MQM framework.
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


class MQMErrorType(Enum):
    """MQM error types for translation quality assessment."""

    # Terminology Issues
    TERMINOLOGY = "Terminology"

    # Accuracy Issues
    MISTRANSLATION = "Mistranslation"
    OMISSION = "Omission"
    ADDITION = "Addition"
    UNTRANSLATED = "Untranslated"
    OVER_TRANSLATION = "Over-translation"
    UNDER_TRANSLATION = "Under-translation"

    # Fluency Issues
    AWKWARDNESS = "Awkwardness"
    UNINTELLIGIBILITY = "Unintelligibility"
    STYLE = "Style"
    TONE = "Tone"
    REGISTER = "Register"
    CONSISTENCY = "Consistency"

    # Conventions Issues
    GRAMMAR = "Grammar"
    ORTHOGRAPHY = "Orthography"
    PUNCTUATION = "Punctuation"
    TYPOGRAPHY = "Typography"
    LOCALE = "Locale"
    CAPITALIZATION = "Capitalization"

    # Design/Markup Issues
    MARKUP = "Markup"
    FORMATTING = "Formatting"
    LENGTH = "Length"

    # Other
    OTHER = "Other"


class MQMSeverity(Enum):
    """MQM severity levels for translation errors."""

    CRITICAL = "critical"      # Message cannot be understood
    MAJOR = "major"            # Message understood but functionality impaired
    MINOR = "minor"            # Message understood but may cause user irritation
    NEUTRAL = "neutral"        # No impact on quality


class MQMCategory(Enum):
    """High-level MQM categories."""

    TERMINOLOGY = "Terminology"
    ACCURACY = "Accuracy"
    FLUENCY = "Fluency"
    CONVENTIONS = "Conventions"
    DESIGN = "Design"
    OTHER = "Other"


@dataclass
class MQMError:
    """Represents an MQM-classified translation error."""

    error_type: MQMErrorType
    category: MQMCategory
    severity: MQMSeverity
    segment_id: str
    source_text: str
    target_text: str
    message: str
    explanation: Optional[str] = None
    suggestion: Optional[str] = None

    def __str__(self) -> str:
        """Return formatted error string."""
        return (
            f"[{self.severity.value.upper()}] {self.error_type.value} - "
            f"{self.message}\n"
            f"  Source: {self.source_text}\n"
            f"  Target: {self.target_text}"
        )


class MQMClassifier:
    """Classifies errors into MQM categories and types."""

    # Mapping of error keywords to MQM error types
    ERROR_KEYWORDS = {
        # Terminology
        "terminology": MQMErrorType.TERMINOLOGY,
        "term": MQMErrorType.TERMINOLOGY,
        "glossary": MQMErrorType.TERMINOLOGY,

        # Accuracy - Mistranslation
        "mistranslation": MQMErrorType.MISTRANSLATION,
        "incorrect translation": MQMErrorType.MISTRANSLATION,
        "wrong translation": MQMErrorType.MISTRANSLATION,
        "mistranslated": MQMErrorType.MISTRANSLATION,

        # Accuracy - Omission
        "omission": MQMErrorType.OMISSION,
        "missing": MQMErrorType.OMISSION,
        "omitted": MQMErrorType.OMISSION,

        # Accuracy - Addition
        "addition": MQMErrorType.ADDITION,
        "added": MQMErrorType.ADDITION,
        "extra text": MQMErrorType.ADDITION,

        # Accuracy - Untranslated
        "untranslated": MQMErrorType.UNTRANSLATED,
        "not translated": MQMErrorType.UNTRANSLATED,

        # Fluency - Awkwardness
        "awkward": MQMErrorType.AWKWARDNESS,
        "awkwardness": MQMErrorType.AWKWARDNESS,
        "unnatural": MQMErrorType.AWKWARDNESS,
        "clunky": MQMErrorType.AWKWARDNESS,

        # Fluency - Unintelligibility
        "unintelligible": MQMErrorType.UNINTELLIGIBILITY,
        "incomprehensible": MQMErrorType.UNINTELLIGIBILITY,
        "unclear": MQMErrorType.UNINTELLIGIBILITY,

        # Fluency - Style
        "style": MQMErrorType.STYLE,
        "stylistic": MQMErrorType.STYLE,

        # Fluency - Tone
        "tone": MQMErrorType.TONE,
        "inappropriate tone": MQMErrorType.TONE,

        # Fluency - Register
        "register": MQMErrorType.REGISTER,
        "register issue": MQMErrorType.REGISTER,
        "formal": MQMErrorType.REGISTER,
        "informal": MQMErrorType.REGISTER,

        # Fluency - Consistency
        "inconsistent": MQMErrorType.CONSISTENCY,
        "inconsistency": MQMErrorType.CONSISTENCY,

        # Conventions - Grammar
        "grammar": MQMErrorType.GRAMMAR,
        "grammatical": MQMErrorType.GRAMMAR,
        "grammatically incorrect": MQMErrorType.GRAMMAR,

        # Conventions - Orthography
        "orthography": MQMErrorType.ORTHOGRAPHY,
        "spelling": MQMErrorType.ORTHOGRAPHY,
        "misspelled": MQMErrorType.ORTHOGRAPHY,

        # Conventions - Punctuation
        "punctuation": MQMErrorType.PUNCTUATION,
        "punctuation mark": MQMErrorType.PUNCTUATION,

        # Conventions - Typography
        "typography": MQMErrorType.TYPOGRAPHY,
        "typographic": MQMErrorType.TYPOGRAPHY,

        # Conventions - Locale
        "locale": MQMErrorType.LOCALE,
        "localization": MQMErrorType.LOCALE,
        "culturally": MQMErrorType.LOCALE,

        # Design - Markup
        "markup": MQMErrorType.MARKUP,
        "tag": MQMErrorType.MARKUP,
        "xml": MQMErrorType.MARKUP,
        "html": MQMErrorType.MARKUP,

        # Design - Formatting
        "formatting": MQMErrorType.FORMATTING,
        "format": MQMErrorType.FORMATTING,

        # Design - Length
        "length": MQMErrorType.LENGTH,
        "too long": MQMErrorType.LENGTH,
        "truncated": MQMErrorType.LENGTH,
    }

    @staticmethod
    def error_type_to_category(error_type: MQMErrorType) -> MQMCategory:
        """Map MQMErrorType to MQMCategory."""
        if error_type == MQMErrorType.TERMINOLOGY:
            return MQMCategory.TERMINOLOGY
        elif error_type in {
            MQMErrorType.MISTRANSLATION, MQMErrorType.OMISSION,
            MQMErrorType.ADDITION, MQMErrorType.UNTRANSLATED,
            MQMErrorType.OVER_TRANSLATION, MQMErrorType.UNDER_TRANSLATION
        }:
            return MQMCategory.ACCURACY
        elif error_type in {
            MQMErrorType.AWKWARDNESS, MQMErrorType.UNINTELLIGIBILITY,
            MQMErrorType.STYLE, MQMErrorType.TONE, MQMErrorType.REGISTER,
            MQMErrorType.CONSISTENCY
        }:
            return MQMCategory.FLUENCY
        elif error_type in {
            MQMErrorType.GRAMMAR, MQMErrorType.ORTHOGRAPHY,
            MQMErrorType.PUNCTUATION, MQMErrorType.TYPOGRAPHY,
            MQMErrorType.LOCALE, MQMErrorType.CAPITALIZATION
        }:
            return MQMCategory.CONVENTIONS
        elif error_type in {
            MQMErrorType.MARKUP, MQMErrorType.FORMATTING, MQMErrorType.LENGTH
        }:
            return MQMCategory.DESIGN
        else:
            return MQMCategory.OTHER

    @staticmethod
    def classify_error(
        error_type: MQMErrorType,
        severity: MQMSeverity,
        segment_id: str,
        source_text: str,
        target_text: str,
        message: str,
        explanation: Optional[str] = None,
        suggestion: Optional[str] = None,
    ) -> MQMError:
        """Create a classified MQM error."""
        category = MQMClassifier.error_type_to_category(error_type)

        return MQMError(
            error_type=error_type,
            category=category,
            severity=severity,
            segment_id=segment_id,
            source_text=source_text,
            target_text=target_text,
            message=message,
            explanation=explanation,
            suggestion=suggestion,
        )

    @staticmethod
    def infer_error_type(message: str) -> MQMErrorType:
        """Infer MQM error type from error message."""
        message_lower = message.lower()

        # Check keywords in order of specificity
        for keyword, error_type in MQMClassifier.ERROR_KEYWORDS.items():
            if keyword in message_lower:
                return error_type

        return MQMErrorType.OTHER

    @staticmethod
    def infer_severity(message: str) -> MQMSeverity:
        """Infer severity level from error message."""
        message_lower = message.lower()

        # Critical indicators
        critical_keywords = {
            "cannot", "incomprehensible", "unintelligible", "untranslated",
            "missing critical", "critical error"
        }
        if any(kw in message_lower for kw in critical_keywords):
            return MQMSeverity.CRITICAL

        # Major indicators
        major_keywords = {
            "incorrect", "wrong", "mistranslation", "inconsistent",
            "grammatical error", "major issue"
        }
        if any(kw in message_lower for kw in major_keywords):
            return MQMSeverity.MAJOR

        # Minor indicators
        minor_keywords = {
            "minor", "small", "slight", "awkward", "style", "tone",
            "may cause", "could be"
        }
        if any(kw in message_lower for kw in minor_keywords):
            return MQMSeverity.MINOR

        return MQMSeverity.NEUTRAL
