"""
Tests for AI error prediction and MQM classification.
"""

from .mqm_typology import (
    MQMError, MQMErrorType, MQMSeverity, MQMCategory, MQMClassifier
)
from .ai_predictor import (
    AIPredictionConfig, AIEngine, MockAIPredictor, PredictorFactory
)
from ..parser.models import Segment, SegmentStatus


def create_test_segments():
    """Create test segments for AI prediction."""
    return [
        Segment(
            segment_id="1",
            source_text="Click Save",
            target_text="Tıkla Kaydet",
            status=SegmentStatus.TRANSLATED,
            source_language="en",
            target_language="tr",
        ),
        Segment(
            segment_id="2",
            source_text="This is a very long source text that is quite detailed and comprehensive",
            target_text="Bu çok uzun bir kaynak metindir bu çok uzun bir çeviridir çok uzun",
            status=SegmentStatus.TRANSLATED,
            source_language="en",
            target_language="tr",
        ),
        Segment(
            segment_id="3",
            source_text="Save file",
            target_text="",
            status=SegmentStatus.NEEDS_TRANSLATION,
            source_language="en",
            target_language="tr",
        ),
        Segment(
            segment_id="4",
            source_text="Enter password",
            target_text="Enter password",
            status=SegmentStatus.TRANSLATED,
            source_language="en",
            target_language="tr",
        ),
    ]


def demo_mqm_classification():
    """Demonstrate MQM classification system."""
    print("\n" + "=" * 80)
    print("DEMO 1: MQM Classification System")
    print("=" * 80 + "\n")

    # Create some test errors
    errors = [
        MQMError(
            error_type=MQMErrorType.MISTRANSLATION,
            category=MQMCategory.ACCURACY,
            severity=MQMSeverity.MAJOR,
            segment_id="seg-1",
            source_text="Click Save",
            target_text="Tıkla Kaydet",
            message="'Click' should use 'Tıkla' (action verb) not 'Tıklama'",
            explanation="Inconsistent terminology usage",
            suggestion="Use 'Tıkla Kaydet' for consistent terminology",
        ),
        MQMError(
            error_type=MQMErrorType.OMISSION,
            category=MQMCategory.ACCURACY,
            severity=MQMSeverity.CRITICAL,
            segment_id="seg-3",
            source_text="Save file",
            target_text="",
            message="Untranslated segment",
            explanation="Target text is empty",
            suggestion="Provide translation: 'Dosyayı Kaydet'",
        ),
        MQMError(
            error_type=MQMErrorType.AWKWARDNESS,
            category=MQMCategory.FLUENCY,
            severity=MQMSeverity.MINOR,
            segment_id="seg-2",
            source_text="This is a very long source text...",
            target_text="Bu çok uzun bir kaynak metindir...",
            message="Translation is significantly longer than source",
            explanation="Over-translation may reduce readability",
            suggestion="Condense to more concise Turkish equivalent",
        ),
    ]

    print(f"Classified {len(errors)} errors:\n")

    # Group by category
    grouped_by_category = {}
    for error in errors:
        if error.category not in grouped_by_category:
            grouped_by_category[error.category] = []
        grouped_by_category[error.category].append(error)

    for category, cat_errors in sorted(grouped_by_category.items(), key=lambda x: x[0].value):
        print(f"\n{category.value}:")
        for error in cat_errors:
            print(f"  [{error.severity.value.upper()}] {error.error_type.value}")
            print(f"    Message: {error.message}")
            print(f"    Suggestion: {error.suggestion}")


def demo_mqm_inference():
    """Demonstrate MQM type and severity inference."""
    print("\n" + "=" * 80)
    print("DEMO 2: MQM Type and Severity Inference")
    print("=" * 80 + "\n")

    test_messages = [
        "This is a mistranslation - the source means X but target says Y",
        "Critical error: untranslated segment cannot be processed",
        "Minor grammar issue: awkward phrasing could be improved",
        "Inconsistent terminology usage detected across segments",
        "Target text is too long and may cause layout issues",
    ]

    print("Inferring error types and severities:\n")

    for message in test_messages:
        error_type = MQMClassifier.infer_error_type(message)
        severity = MQMClassifier.infer_severity(message)
        category = MQMClassifier.error_type_to_category(error_type)

        print(f"Message: {message}")
        print(f"  Type: {error_type.value}")
        print(f"  Category: {category.value}")
        print(f"  Severity: {severity.value}\n")


def demo_mock_predictor():
    """Demonstrate mock AI predictor."""
    print("\n" + "=" * 80)
    print("DEMO 3: Mock AI Predictor")
    print("=" * 80 + "\n")

    segments = create_test_segments()

    # Create mock predictor
    config = AIPredictionConfig(
        engine=AIEngine.OPENAI,
        api_key="mock-key",
        model="gpt-4-turbo"
    )
    predictor = MockAIPredictor(config)

    predictions = predictor.predict(segments)

    print(f"Generated {len(predictions)} predictions:\n")

    for prediction in predictions:
        print(f"Segment {prediction.segment_id}:")
        print(f"  Source: {prediction.source_text}")
        print(f"  Target: {prediction.target_text}")
        print(f"  Confidence: {prediction.confidence_score:.0%}")
        print(f"  Errors: {len(prediction.errors)}")

        if prediction.errors:
            print("  Issues:")
            for error in prediction.errors:
                print(f"    - [{error.severity.value}] {error.message}")

        print(f"  Comment: {prediction.overall_comment}\n")

    # Summary
    print("\nOverall Summary:")
    total_errors = sum(len(p.errors) for p in predictions)
    print(f"  Total errors found: {total_errors}")

    # Error distribution by severity
    severity_dist = {}
    for prediction in predictions:
        for error in prediction.errors:
            severity = error.severity.value
            severity_dist[severity] = severity_dist.get(severity, 0) + 1

    if severity_dist:
        print("  By Severity:")
        for severity, count in sorted(severity_dist.items()):
            print(f"    - {severity}: {count}")

    # Error distribution by category
    category_dist = {}
    for prediction in predictions:
        for error in prediction.errors:
            category = error.category.value
            category_dist[category] = category_dist.get(category, 0) + 1

    if category_dist:
        print("  By Category:")
        for category, count in sorted(category_dist.items()):
            print(f"    - {category}: {count}")


def demo_prediction_grouping():
    """Demonstrate error grouping in predictions."""
    print("\n" + "=" * 80)
    print("DEMO 4: Error Grouping and Statistics")
    print("=" * 80 + "\n")

    from .ai_predictor import AIPrediction

    # Create a sample prediction with mixed errors
    errors = [
        MQMError(
            error_type=MQMErrorType.MISTRANSLATION,
            category=MQMCategory.ACCURACY,
            severity=MQMSeverity.CRITICAL,
            segment_id="1",
            source_text="Save",
            target_text="Kaydet",
            message="Incorrect term",
        ),
        MQMError(
            error_type=MQMErrorType.GRAMMAR,
            category=MQMCategory.CONVENTIONS,
            severity=MQMSeverity.MINOR,
            segment_id="1",
            source_text="Save",
            target_text="Kaydet",
            message="Grammar issue",
        ),
        MQMError(
            error_type=MQMErrorType.STYLE,
            category=MQMCategory.FLUENCY,
            severity=MQMSeverity.MINOR,
            segment_id="1",
            source_text="Save",
            target_text="Kaydet",
            message="Awkward phrasing",
        ),
    ]

    prediction = AIPrediction(
        segment_id="1",
        source_text="Save",
        target_text="Kaydet",
        errors=errors,
        overall_comment="This translation has multiple minor issues with one critical error",
        confidence_score=0.75,
    )

    print("Prediction Summary:")
    print(f"  Segment ID: {prediction.segment_id}")
    print(f"  Confidence: {prediction.confidence_score:.0%}\n")

    # Show errors by category
    print("Errors by Category:")
    errors_by_cat = prediction.errors_by_category()
    for category in sorted(errors_by_cat.keys(), key=lambda x: x.value):
        print(f"  {category.value}: {len(errors_by_cat[category])} errors")

    print("\nErrors by Severity:")
    errors_by_sev = prediction.errors_by_severity()
    for severity in sorted(errors_by_sev.keys(), key=lambda x: x.value):
        print(f"  {severity.value}: {len(errors_by_sev[severity])} errors")

    print("\nStatistics:")
    stats = prediction.summary_stats()
    print(f"  Total Errors: {stats['total_errors']}")
    print(f"  By Severity: {stats['by_severity']}")
    print(f"  By Category: {stats['by_category']}")
    print(f"  Confidence: {stats['confidence']:.0%}")


if __name__ == "__main__":
    demo_mqm_classification()
    demo_mqm_inference()
    demo_mock_predictor()
    demo_prediction_grouping()
    print("\n" + "=" * 80)
    print("All AI Predictor demos completed successfully!")
    print("=" * 80 + "\n")
