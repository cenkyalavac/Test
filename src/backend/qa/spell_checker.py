"""
Multi-language Spell Checker for Translation QA

Integrates PySpellChecker for detecting spelling errors across multiple languages.
Spell check errors are classified as LQA (Language Quality Assurance) issues.
"""

import re
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

try:
    from spellchecker import SpellChecker
    SPELLCHECKER_AVAILABLE = True
except ImportError:
    SPELLCHECKER_AVAILABLE = False


class SupportedLanguage(Enum):
    """Languages supported by PySpellChecker."""
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    GERMAN = "de"
    PORTUGUESE = "pt"
    RUSSIAN = "ru"
    POLISH = "pl"
    ITALIAN = "it"
    DUTCH = "nl"
    TURKISH = "tr"  # Limited support
    ARABIC = "ar"   # Limited support
    GREEK = "el"    # Limited support
    CHINESE = "zh"  # Partial support


@dataclass
class SpellingError:
    """Represents a spelling error found in text."""
    word: str
    position: int
    suggestions: List[str]
    language: str
    context: str  # Word with context (e.g., "the quikc fox")

    def __str__(self) -> str:
        suggestions_text = ", ".join(self.suggestions[:3]) if self.suggestions else "no suggestions"
        return f"'{self.word}' at pos {self.position} ({suggestions_text})"


class MultiLanguageSpellChecker:
    """
    Spell checker supporting multiple languages.
    Uses PySpellChecker library.
    """

    # Language-specific configurations
    LANGUAGE_CONFIGS = {
        SupportedLanguage.ENGLISH: {"language": "en", "threshold": 0.95},
        SupportedLanguage.SPANISH: {"language": "es", "threshold": 0.95},
        SupportedLanguage.FRENCH: {"language": "fr", "threshold": 0.95},
        SupportedLanguage.GERMAN: {"language": "de", "threshold": 0.95},
        SupportedLanguage.PORTUGUESE: {"language": "pt", "threshold": 0.95},
        SupportedLanguage.RUSSIAN: {"language": "ru", "threshold": 0.90},
        SupportedLanguage.POLISH: {"language": "pl", "threshold": 0.90},
        SupportedLanguage.ITALIAN: {"language": "it", "threshold": 0.95},
        SupportedLanguage.DUTCH: {"language": "nl", "threshold": 0.95},
    }

    # Words to ignore (common technical terms, proper nouns, etc.)
    IGNORE_PATTERNS = [
        r"^[A-Z][a-z]*$",  # Proper nouns (capitalized)
        r"^\d+$",           # Numbers
        r"^[A-Z]{2,}$",     # Acronyms
        r"^[a-z0-9_.+-]+@[a-z0-9-]+\.[a-z0-9-.]+$",  # Email addresses
        r"^https?://.*",    # URLs
        r"^[A-Z]:[\\\/].*", # Windows paths
        r"^\/.*",           # Unix paths
    ]

    def __init__(self, language: SupportedLanguage = SupportedLanguage.ENGLISH,
                 custom_words: Optional[Set[str]] = None):
        """
        Initialize spell checker for a specific language.

        Args:
            language: Target language for spell checking
            custom_words: Set of custom words to add to dictionary
        """
        if not SPELLCHECKER_AVAILABLE:
            raise ImportError(
                "PySpellChecker not installed. Install with: pip install pyspellchecker"
            )

        self.language = language
        self.config = self.LANGUAGE_CONFIGS.get(language, {})

        try:
            self.checker = SpellChecker(language=self.config.get("language", "en"))
        except Exception as e:
            raise RuntimeError(f"Failed to initialize spell checker for {language}: {e}")

        # Add custom words
        if custom_words:
            self.checker.word_probability.load_words(custom_words)

    def add_custom_words(self, words: Set[str]) -> None:
        """Add custom words to the dictionary (e.g., technical terms, brand names)."""
        for word in words:
            self.checker.word_probability.load_words([word.lower()])

    def check_text(self, text: str, ignore_case: bool = False) -> List[SpellingError]:
        """
        Check text for spelling errors.

        Args:
            text: Text to check
            ignore_case: Whether to ignore case sensitivity

        Returns:
            List of spelling errors found
        """
        if not text or not text.strip():
            return []

        errors = []
        words = text.split()
        position = 0

        for word_idx, word in enumerate(words):
            # Extract actual word without punctuation
            match = re.match(r'^(\W*)(\w+)(\W*)$', word)
            if not match:
                position += len(word) + 1
                continue

            prefix, actual_word, suffix = match.groups()
            check_word = actual_word.lower() if ignore_case else actual_word

            # Skip if word matches ignore patterns
            if self._should_ignore_word(check_word):
                position += len(word) + 1
                continue

            # Check spelling
            if check_word not in self.checker:
                suggestions = self.checker.correction(check_word)
                if isinstance(suggestions, str):
                    suggestions = [suggestions]
                else:
                    suggestions = list(suggestions) if suggestions else []

                # Get context (surrounding words)
                context_start = max(0, word_idx - 2)
                context_end = min(len(words), word_idx + 3)
                context = " ".join(words[context_start:context_end])

                error = SpellingError(
                    word=actual_word,
                    position=position + len(prefix),
                    suggestions=suggestions[:5],  # Top 5 suggestions
                    language=self.language.value,
                    context=context
                )
                errors.append(error)

            position += len(word) + 1

        return errors

    def get_suggestions(self, word: str, count: int = 5) -> List[str]:
        """Get spelling suggestions for a word."""
        if not word:
            return []

        suggestions = self.checker.correction(word)
        if isinstance(suggestions, str):
            return [suggestions]
        elif isinstance(suggestions, (list, set)):
            return list(suggestions)[:count]
        else:
            return []

    def _should_ignore_word(self, word: str) -> bool:
        """Check if word should be ignored (proper noun, technical term, etc.)."""
        for pattern in self.IGNORE_PATTERNS:
            if re.match(pattern, word):
                return True
        return False


class MultiLanguageChecker:
    """Wrapper for checking multiple languages."""

    def __init__(self):
        """Initialize with checkers for common languages."""
        self.checkers: Dict[SupportedLanguage, MultiLanguageSpellChecker] = {}
        self.default_language = SupportedLanguage.ENGLISH

    def get_checker(self, language: SupportedLanguage) -> MultiLanguageSpellChecker:
        """Get or create spell checker for a language."""
        if language not in self.checkers:
            try:
                self.checkers[language] = MultiLanguageSpellChecker(language)
            except Exception as e:
                print(f"Warning: Could not initialize checker for {language}: {e}")
                # Fallback to English
                if self.default_language not in self.checkers:
                    self.checkers[self.default_language] = MultiLanguageSpellChecker(
                        self.default_language
                    )
                return self.checkers[self.default_language]

        return self.checkers[language]

    def check_text(self, text: str, language: SupportedLanguage) -> List[SpellingError]:
        """Check text in specified language."""
        checker = self.get_checker(language)
        return checker.check_text(text)

    def add_custom_words(self, words: Set[str], language: SupportedLanguage) -> None:
        """Add custom words to a language's dictionary."""
        checker = self.get_checker(language)
        checker.add_custom_words(words)


# Global instance
_global_checker = MultiLanguageChecker()


def get_spell_checker(language: SupportedLanguage = SupportedLanguage.ENGLISH) -> MultiLanguageSpellChecker:
    """Get a spell checker for a specific language."""
    return _global_checker.get_checker(language)


def check_spelling(text: str, language: SupportedLanguage = SupportedLanguage.ENGLISH) -> List[SpellingError]:
    """Quick function to check spelling in text."""
    checker = get_spell_checker(language)
    return checker.check_text(text)
