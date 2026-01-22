"""
Tests for spell checker functionality.
"""

try:
    from .spell_checker import (
        MultiLanguageSpellChecker, SupportedLanguage, SpellingError,
        SPELLCHECKER_AVAILABLE, check_spelling
    )
    SPELL_CHECKER_AVAILABLE = True
except ImportError:
    SPELL_CHECKER_AVAILABLE = False


def test_spell_checker_availability():
    """Test if spell checker is available."""
    print("\n" + "=" * 80)
    print("TEST 1: Spell Checker Availability")
    print("=" * 80 + "\n")

    if SPELL_CHECKER_AVAILABLE:
        print("✓ PySpellChecker is installed and available")
    else:
        print("✗ PySpellChecker is NOT installed")
        print("  Install with: pip install pyspellchecker")
    print()


def test_english_spell_checker():
    """Test English spell checking."""
    if not SPELL_CHECKER_AVAILABLE:
        print("Skipping spell checker tests (PySpellChecker not installed)")
        return

    print("\n" + "=" * 80)
    print("TEST 2: English Spell Checking")
    print("=" * 80 + "\n")

    checker = MultiLanguageSpellChecker(SupportedLanguage.ENGLISH)

    test_texts = [
        ("This is a corect sentence.", "Should detect 'corect'"),
        ("The qwick brown fox jumps.", "Should detect 'qwick'"),
        ("Click Save buttom.", "Should detect 'buttom'"),
        ("No errros here.", "Should detect 'errros'"),
        ("This is correct.", "Should find no errors"),
    ]

    for text, description in test_texts:
        errors = checker.check_text(text)
        print(f"Text: {text}")
        print(f"Expected: {description}")
        if errors:
            print(f"Found {len(errors)} error(s):")
            for error in errors:
                print(f"  - {error}")
        else:
            print("No errors found")
        print()


def test_custom_words():
    """Test adding custom words to dictionary."""
    if not SPELL_CHECKER_AVAILABLE:
        print("Skipping custom words test")
        return

    print("\n" + "=" * 80)
    print("TEST 3: Custom Words")
    print("=" * 80 + "\n")

    checker = MultiLanguageSpellChecker(SupportedLanguage.ENGLISH)

    # Check before adding custom word
    text = "Use PySpellChecker for validation"
    errors_before = checker.check_text(text)
    print(f"Before adding custom word: {len(errors_before)} error(s)")
    if errors_before:
        for error in errors_before:
            print(f"  - {error.word}")

    # Add custom word
    checker.add_custom_words({"PySpellChecker", "validation"})

    # Check after adding
    errors_after = checker.check_text(text)
    print(f"\nAfter adding custom words: {len(errors_after)} error(s)")
    if errors_after:
        for error in errors_after:
            print(f"  - {error.word}")

    print()


def test_suggestions():
    """Test spelling suggestions."""
    if not SPELL_CHECKER_AVAILABLE:
        print("Skipping suggestions test")
        return

    print("\n" + "=" * 80)
    print("TEST 4: Spelling Suggestions")
    print("=" * 80 + "\n")

    checker = MultiLanguageSpellChecker(SupportedLanguage.ENGLISH)

    words = ["speling", "corect", "languag", "eror"]

    for word in words:
        suggestions = checker.get_suggestions(word, count=5)
        print(f"'{word}' suggestions: {suggestions}")

    print()


def test_ignore_patterns():
    """Test ignoring proper nouns, URLs, emails, etc."""
    if not SPELL_CHECKER_AVAILABLE:
        print("Skipping ignore patterns test")
        return

    print("\n" + "=" * 80)
    print("TEST 5: Ignoring Special Patterns")
    print("=" * 80 + "\n")

    checker = MultiLanguageSpellChecker(SupportedLanguage.ENGLISH)

    test_texts = [
        "Contact user@example.com for support",
        "Visit https://example.com for more",
        "Use C:\\Program Files\\Software",
        "John Smith works here",
        "API_KEY=abc123def456",
    ]

    for text in test_texts:
        errors = checker.check_text(text)
        print(f"Text: {text}")
        print(f"Errors found: {len(errors)}")
        if errors:
            for error in errors:
                print(f"  - {error.word}")
        print()


if __name__ == "__main__":
    test_spell_checker_availability()

    if SPELL_CHECKER_AVAILABLE:
        test_english_spell_checker()
        test_custom_words()
        test_suggestions()
        test_ignore_patterns()
        print("\n" + "=" * 80)
        print("All spell checker tests completed!")
        print("=" * 80 + "\n")
    else:
        print("\nTo run all tests, install PySpellChecker:")
        print("  pip install pyspellchecker")
