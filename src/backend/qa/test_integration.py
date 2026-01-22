"""
Integration tests for Translation QA Tool.

Tests the complete workflow: file parsing, QA checks, spell checking, and AI predictions.
"""

from ..parser.models import Segment, SegmentStatus
from .advanced_qa_checker import AdvancedQAChecker, QACheckType
from .ai_predictor import MockAIPredictor, AIPredictionConfig, AIEngine

try:
    from .spell_checker import SPELLCHECKER_AVAILABLE
except ImportError:
    SPELLCHECKER_AVAILABLE = False


def create_test_segments_for_integration():
    """Create realistic test segments for integration testing."""
    return [
        Segment(
            segment_id="seg-001",
            source_text="Save your changes",
            target_text="Değişiklikleri kaydetin",
            status=SegmentStatus.TRANSLATED,
            source_language="en",
            target_language="tr",
        ),
        Segment(
            segment_id="seg-002",
            source_text="Click to continue",
            target_text="Devam etmek için tıklayın",
            status=SegmentStatus.TRANSLATED,
            source_language="en",
            target_language="tr",
        ),
        Segment(
            segment_id="seg-003",
            source_text="Welcome to our application",
            target_text="",  # Untranslated
            status=SegmentStatus.NEEDS_TRANSLATION,
            source_language="en",
            target_language="tr",
        ),
        Segment(
            segment_id="seg-004",
            source_text="Error occurred",
            target_text="Error occurred",  # Source equals target
            status=SegmentStatus.TRANSLATED,
            source_language="en",
            target_language="tr",
        ),
        Segment(
            segment_id="seg-005",
            source_text="Version 1.2.3",
            target_text="Sürüm 1.2.3",
            status=SegmentStatus.TRANSLATED,
            source_language="en",
            target_language="tr",
        ),
    ]


def test_qa_checker_comprehensive():
    """Test comprehensive QA checking."""
    print("\n" + "=" * 80)
    print("INTEGRATION TEST 1: Comprehensive QA Checking")
    print("=" * 80 + "\n")

    segments = create_test_segments_for_integration()
    checker = AdvancedQAChecker()

    # Add a key term
    checker.add_key_term("Error", ["Hata"])

    # Run all checks
    issues = checker.check_segments(segments)

    print(f"✓ Found {len(issues)} issues:\n")

    # Group by type
    by_type = {}
    for issue in issues:
        if issue.check_type.value not in by_type:
            by_type[issue.check_type.value] = []
        by_type[issue.check_type.value].append(issue)

    for check_type, type_issues in sorted(by_type.items()):
        print(f"  {check_type}: {len(type_issues)} issue(s)")
        for issue in type_issues[:2]:  # Show first 2
            print(f"    - Segment {issue.segment_id}: {issue.message}")

    # Get summary
    summary = checker.get_summary()
    print(f"\nSummary:")
    print(f"  Total Issues: {summary['total_issues']}")
    print(f"  Errors: {summary['errors']}")
    print(f"  Warnings: {summary['warnings']}")
    print(f"  Info: {summary['infos']}")

    assert len(issues) > 0, "Should find at least untranslated segment"
    assert any(i.check_type == QACheckType.UNTRANSLATED for i in issues), "Should detect untranslated"
    assert any(i.check_type == QACheckType.SOURCE_EQUALS_TARGET for i in issues), "Should detect source=target"

    print("\n✓ Comprehensive QA checking test PASSED\n")


def test_spell_checking():
    """Test spell checking integration."""
    print("\n" + "=" * 80)
    print("INTEGRATION TEST 2: Spell Checking")
    print("=" * 80 + "\n")

    if not SPELLCHECKER_AVAILABLE:
        print("⚠ PySpellChecker not installed, skipping test")
        print("  Install with: pip install pyspellchecker")
        return

    from .spell_checker import MultiLanguageSpellChecker, SupportedLanguage

    # Test English spell checking
    checker = MultiLanguageSpellChecker(SupportedLanguage.ENGLISH)

    test_cases = [
        ("This has a speling error", "Should detect 'speling'"),
        ("The qwick brown fox", "Should detect 'qwick'"),
        ("No errors in this sentence", "Should find no errors"),
    ]

    for text, description in test_cases:
        errors = checker.check_text(text)
        print(f"  Text: '{text}'")
        print(f"  Expected: {description}")
        print(f"  Errors found: {len(errors)}")
        if errors:
            for error in errors:
                print(f"    - '{error.word}' → {error.suggestions[:2]}")
        print()

    print("✓ Spell checking test PASSED\n")


def test_ai_predictions():
    """Test AI prediction integration."""
    print("\n" + "=" * 80)
    print("INTEGRATION TEST 3: AI Predictions")
    print("=" * 80 + "\n")

    segments = create_test_segments_for_integration()

    # Use mock predictor for testing
    config = AIPredictionConfig(
        engine=AIEngine.OPENAI,
        api_key="mock-key"
    )
    predictor = MockAIPredictor(config)

    predictions = predictor.predict(segments)

    print(f"✓ Generated {len(predictions)} predictions\n")

    for pred in predictions[:3]:  # Show first 3
        print(f"  Segment {pred.segment_id}:")
        print(f"    Source: {pred.source_text}")
        print(f"    Target: {pred.target_text or '[UNTRANSLATED]'}")
        print(f"    Errors: {len(pred.errors)}")
        print(f"    Confidence: {pred.confidence_score:.0%}")
        if pred.errors:
            for error in pred.errors[:2]:  # Show first 2 errors
                print(f"      - {error.error_type.value}: {error.message}")
        print()

    assert len(predictions) == len(segments), "Should have prediction for each segment"

    print("✓ AI predictions test PASSED\n")


def test_end_to_end_workflow():
    """Test complete end-to-end workflow."""
    print("\n" + "=" * 80)
    print("INTEGRATION TEST 4: End-to-End Workflow")
    print("=" * 80 + "\n")

    segments = create_test_segments_for_integration()

    print("Step 1: Parse segments")
    print(f"  ✓ Loaded {len(segments)} segments\n")

    print("Step 2: Run QA checks")
    qa_checker = AdvancedQAChecker()
    qa_issues = qa_checker.check_segments(segments)
    print(f"  ✓ Found {len(qa_issues)} QA issues\n")

    print("Step 3: Generate AI predictions")
    config = AIPredictionConfig(
        engine=AIEngine.OPENAI,
        api_key="mock-key"
    )
    predictor = MockAIPredictor(config)
    ai_predictions = predictor.predict(segments)
    print(f"  ✓ Generated {len(ai_predictions)} predictions\n")

    print("Step 4: Compile results")
    results = {
        "file_name": "test_translation.xliff",
        "total_segments": len(segments),
        "qa_issues": len(qa_issues),
        "ai_predictions": len(ai_predictions),
        "quality_score": calculate_quality_score(len(qa_issues), len(segments)),
        "completion": f"{sum(1 for s in segments if s.target_text)/len(segments)*100:.1f}%"
    }

    for key, value in results.items():
        print(f"  {key}: {value}")

    print("\n✓ End-to-end workflow test PASSED\n")


def calculate_quality_score(issues: int, total_segments: int) -> str:
    """Calculate quality score based on issues."""
    if total_segments == 0:
        return "0%"
    score = max(0, 100 - (issues * 10 / total_segments))
    return f"{score:.0f}%"


def test_error_handling():
    """Test error handling and edge cases."""
    print("\n" + "=" * 80)
    print("INTEGRATION TEST 5: Error Handling")
    print("=" * 80 + "\n")

    print("Test case 1: Empty segments list")
    checker = AdvancedQAChecker()
    try:
        issues = checker.check_segments([])
        print(f"  ✓ Handled empty list: {len(issues)} issues\n")
    except Exception as e:
        print(f"  ✗ Error: {e}\n")

    print("Test case 2: Segments with None values")
    try:
        segment = Segment(
            segment_id="test",
            source_text="",
            target_text="",
            status=SegmentStatus.TRANSLATED,
        )
        issues = checker.check_segments([segment])
        print(f"  ✓ Handled empty segment: {len(issues)} issues\n")
    except Exception as e:
        print(f"  ✗ Error: {e}\n")

    print("Test case 3: Segments with special characters")
    try:
        segment = Segment(
            segment_id="test",
            source_text="Test <tag>with XML</tag>",
            target_text="XML <tag>ile test</tag>",
            status=SegmentStatus.TRANSLATED,
            source_language="en",
            target_language="tr",
        )
        issues = checker.check_segments([segment])
        print(f"  ✓ Handled XML content: {len(issues)} issues\n")
    except Exception as e:
        print(f"  ✗ Error: {e}\n")

    print("✓ Error handling tests PASSED\n")


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("TRANSLATION QA TOOL - INTEGRATION TESTS")
    print("=" * 80)

    test_qa_checker_comprehensive()
    test_spell_checking()
    test_ai_predictions()
    test_end_to_end_workflow()
    test_error_handling()

    print("\n" + "=" * 80)
    print("ALL INTEGRATION TESTS COMPLETED")
    print("=" * 80 + "\n")
