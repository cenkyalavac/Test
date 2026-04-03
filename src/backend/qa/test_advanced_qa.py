"""
Comprehensive tests for Advanced QA Engine.

Demonstrates all 16+ QA check types and XBench Checklist support.
"""

from ..parser.models import Segment, SegmentStatus, InlineTag
from .advanced_qa_checker import AdvancedQAChecker, QACheckType
from .checklist_model import Checklist, CheckRule, CheckTerm, CheckType, SearchMode
from .checklist_parser import ChecklistParser
import tempfile
from pathlib import Path


# Mock Apple Care Checklist (XBench format)
MOCK_APPCARE_CHECKLIST = """<?xml version="1.0" ?>
<xbench-checklist version="1.1">
  <checklist name="AppleCare" source-language="en-us" target-language="tr-tr">
    <check name="corrosion" categories="Terminology">
      <term type="source" xml:space="preserve" searchmode="simple">corrosion</term>
      <term type="target" xml:space="preserve" searchmode="simple">korozyon</term>
      <description xml:space="preserve">Please translate as "korozyon" to distinguish it from "wear".</description>
      <timestamp>2019-11-18 22:56</timestamp>
    </check>
    <check name="stream verb" categories="Terminology">
      <term type="source" xml:space="preserve" searchmode="simple">stream</term>
      <term type="target" xml:space="preserve" searchmode="simple">yayınla</term>
      <description xml:space="preserve">The verb form is "yayımlamak".</description>
      <timestamp>2023-08-03 11:08</timestamp>
    </check>
    <check name="Apple menu" categories="Terminology">
      <term type="source" xml:space="preserve" powersearch="yes" searchmode="simple">Apple menu</term>
      <term type="target" xml:space="preserve" powersearch="yes" searchmode="simple">Apple menüsü</term>
      <description xml:space="preserve">Should be "Apple menüsü".</description>
      <timestamp>2020-06-11 16:17</timestamp>
    </check>
    <check name="click" categories="Terminology">
      <term type="source" xml:space="preserve" searchmode="simple"></term>
      <term type="target" xml:space="preserve" searchmode="simple">tıkla</term>
      <description xml:space="preserve">Use "tıkla" not "tıklat".</description>
      <timestamp>2019-11-26 15:45</timestamp>
    </check>
  </checklist>
</xbench-checklist>
"""


def create_test_segments():
    """Create test segments with various QA issues."""
    segments = []

    # 1. Untranslated segment
    segments.append(Segment(
        segment_id="1",
        source_text="Welcome to Apple Support",
        target_text="",
        status=SegmentStatus.NEEDS_TRANSLATION,
    ))

    # 2. Source equals target
    segments.append(Segment(
        segment_id="2",
        source_text="iPhone",
        target_text="iPhone",
        status=SegmentStatus.TRANSLATED,
    ))

    # 3. Tag mismatch
    segments.append(Segment(
        segment_id="3",
        source_text="Click <g>Save</g> button",
        target_text="Kaydet butonuna tıkla",
        status=SegmentStatus.TRANSLATED,
        source_inline_tags=[InlineTag("g1", "g", "Save")],
        target_inline_tags=[],
    ))

    # 4. Number mismatch
    segments.append(Segment(
        segment_id="4",
        source_text="Model A1234 supports iOS 15.1",
        target_text="Model XYZ iOS'u destekler",
        status=SegmentStatus.TRANSLATED,
    ))

    # 5. URL mismatch
    segments.append(Segment(
        segment_id="5",
        source_text="Visit https://support.apple.com for help",
        target_text="Yardım için siteyi ziyaret edin",
        status=SegmentStatus.TRANSLATED,
    ))

    # 6. Unpaired parentheses
    segments.append(Segment(
        segment_id="6",
        source_text="Settings (for advanced users",
        target_text="Ayarlar (ileri kullanıcılar için",
        status=SegmentStatus.TRANSLATED,
    ))

    # 7. Unpaired quotes
    segments.append(Segment(
        segment_id="7",
        source_text='Enter your "password" correctly',
        target_text='Şifrenizi "doğru" girin',
        status=SegmentStatus.TRANSLATED,
    ))

    # 8. Double spaces
    segments.append(Segment(
        segment_id="8",
        source_text="Click the button",
        target_text="Butona  tıkla",  # Double space
        status=SegmentStatus.TRANSLATED,
    ))

    # 9. UPPERCASE mismatch
    segments.append(Segment(
        segment_id="9",
        source_text="Use USB cable to connect",
        target_text="Bağlamak için kablo kullanın",
        status=SegmentStatus.TRANSLATED,
    ))

    # 10. CamelCase mismatch
    segments.append(Segment(
        segment_id="10",
        source_text="Check your iCloud account",
        target_text="Hesabınızı kontrol edin",
        status=SegmentStatus.TRANSLATED,
    ))

    # 11. Inconsistent translations (same source, different targets)
    segments.append(Segment(
        segment_id="11",
        source_text="Click Save",
        target_text="Kaydet'i tıkla",
        status=SegmentStatus.TRANSLATED,
    ))

    segments.append(Segment(
        segment_id="12",
        source_text="Click Save",
        target_text="Tıklayıp kaydet",
        status=SegmentStatus.TRANSLATED,
    ))

    # 12. Checklist violation (corrosion)
    segments.append(Segment(
        segment_id="13",
        source_text="This corrosion problem needs fixing",
        target_text="Bu aşınma sorunu çözülmesi gerekiyor",  # Wrong: should be "korozyon"
        status=SegmentStatus.TRANSLATED,
    ))

    # 13. Correct terminology usage
    segments.append(Segment(
        segment_id="14",
        source_text="Apple menu options",
        target_text="Apple menüsü seçenekleri",
        status=SegmentStatus.TRANSLATED,
    ))

    return segments


def demo_basic_checks():
    """Demonstrate basic QA checks."""
    print("\n" + "=" * 80)
    print("DEMO 1: Basic QA Checks (16+ check types)")
    print("=" * 80)

    segments = create_test_segments()
    checker = AdvancedQAChecker()
    issues = checker.check_segments(segments)

    print(f"\nFound {len(issues)} QA issues\n")

    # Group by type
    by_type = {}
    for issue in issues:
        if issue.check_type not in by_type:
            by_type[issue.check_type] = []
        by_type[issue.check_type].append(issue)

    for check_type, type_issues in sorted(by_type.items()):
        print(f"\n{check_type.value.upper()} ({len(type_issues)} issues):")
        for issue in type_issues[:3]:  # Show first 3
            print(f"  - [{issue.segment_id}] {issue.message}")


def demo_consistency_checks():
    """Demonstrate consistency checking across segments."""
    print("\n" + "=" * 80)
    print("DEMO 2: Consistency Checks")
    print("=" * 80)

    segments = create_test_segments()
    checker = AdvancedQAChecker()
    issues = checker.check_segments(segments)

    consistency_issues = [
        i for i in issues
        if i.check_type in [
            QACheckType.INCONSISTENT_TRANSLATION,
            QACheckType.INVERSE_INCONSISTENT
        ]
    ]

    print(f"\nFound {len(consistency_issues)} consistency issues:")
    for issue in consistency_issues:
        print(f"\n  Segment {issue.segment_id}: {issue.message}")
        if "other_translations" in issue.details:
            print(f"    Other translations: {issue.details['other_translations']}")


def demo_checklist_validation():
    """Demonstrate XBench Checklist validation."""
    print("\n" + "=" * 80)
    print("DEMO 3: XBench Checklist Validation")
    print("=" * 80)

    # Parse checklist
    parser = ChecklistParser()
    checklist = parser.parse_string(MOCK_APPCARE_CHECKLIST.encode())

    print(f"\nLoaded checklist: {checklist.name}")
    print(f"  Total rules: {checklist.rule_count()}")
    print(f"  Active rules: {checklist.active_rule_count()}")
    print(f"  Rules by category:")

    for rule in checklist.get_active_rules():
        print(f"    - {rule.name} ({rule.category})")

    # Apply checklist
    segments = create_test_segments()
    checker = AdvancedQAChecker()
    checker.load_checklist(checklist)
    issues = checker.check_segments(segments)

    checklist_violations = [
        i for i in issues
        if i.check_type == QACheckType.CHECKLIST_VIOLATION
    ]

    print(f"\nFound {len(checklist_violations)} checklist violations:")
    for issue in checklist_violations:
        print(f"  - [{issue.segment_id}] {issue.message}")


def demo_key_terms():
    """Demonstrate key term glossary checking."""
    print("\n" + "=" * 80)
    print("DEMO 4: Key Terms Glossary")
    print("=" * 80)

    checker = AdvancedQAChecker()

    # Add key terms
    checker.add_key_term("Apple", ["Apple"])
    checker.add_key_term("iCloud", ["iCloud"])
    checker.add_key_term("corrosion", ["korozyon"])

    segments = create_test_segments()
    issues = checker.check_segments(segments)

    key_term_issues = [
        i for i in issues
        if i.check_type == QACheckType.KEY_TERM_MISSING
    ]

    print(f"\nFound {len(key_term_issues)} key term issues:")
    for issue in key_term_issues[:5]:
        print(f"  - [{issue.segment_id}] {issue.message}")
        if "term" in issue.details:
            print(f"    Expected: {issue.details['expected']}")


def demo_summary():
    """Demonstrate QA summary report."""
    print("\n" + "=" * 80)
    print("DEMO 5: QA Summary Report")
    print("=" * 80)

    segments = create_test_segments()
    checker = AdvancedQAChecker()

    # Load checklist
    parser = ChecklistParser()
    checklist = parser.parse_string(MOCK_APPCARE_CHECKLIST.encode())
    checker.load_checklist(checklist)

    # Add key terms
    checker.add_key_term("corrosion", ["korozyon"])
    checker.add_key_term("Apple", ["Apple"])

    # Run checks
    issues = checker.check_segments(segments)
    summary = checker.get_summary()

    print(f"\nQA Report Summary:")
    print(f"  Total Issues: {summary['total_issues']}")
    print(f"  Errors: {summary['errors']}")
    print(f"  Warnings: {summary['warnings']}")
    print(f"  Info: {summary['infos']}")

    print(f"\nIssues by Type:")
    for check_type, count in sorted(summary['by_type'].items()):
        print(f"  - {check_type}: {count}")

    print(f"\nSeverity Distribution:")
    for severity, count in sorted(summary['by_severity'].items()):
        print(f"  - {severity}: {count}")


def run_all_demos():
    """Run all demonstrations."""
    demo_basic_checks()
    demo_consistency_checks()
    demo_checklist_validation()
    demo_key_terms()
    demo_summary()


if __name__ == "__main__":
    run_all_demos()
