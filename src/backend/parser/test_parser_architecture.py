"""
Comprehensive tests for Translation File Parser Architecture.

Demonstrates:
- Strategy Pattern with multiple parser implementations
- Factory Pattern for automatic format detection
- Unified segment extraction across formats
- QA checking capabilities
"""

from .parser_factory import ParserFactory
from .models import SegmentStatus
from ..qa import QAChecker, IssueSeverity, IssueType


# ============================================================================
# Mock Data
# ============================================================================

# Mock XLIFF data (from previous tests)
MOCK_XLIFF = """<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="tr" datatype="plaintext">
    <body>
      <trans-unit id="1">
        <source>Hello, World!</source>
        <target state="translated">Merhaba, Dunya!</target>
      </trans-unit>
      <trans-unit id="2">
        <source>Good morning</source>
        <target state="needs-translation"/>
      </trans-unit>
      <trans-unit id="3">
        <source>Click <g id="1" ctype="bold">Save</g> button</source>
        <target state="translated">Kaydet dugmesine tikla</target>
      </trans-unit>
    </body>
  </file>
</xliff>
"""

# Mock PO data
MOCK_PO = """# Translation file
# Copyright (C)
msgid ""
msgstr ""
"Language: fr\\n"
"MIME-Version: 1.0\\n"

#: main.py:10
msgid "Hello, World!"
msgstr "Bonjour, le monde!"

#: main.py:20
#, fuzzy
msgid "Welcome"
msgstr "Bienvenue"

#: main.py:30
msgid "Untranslated string"
msgstr ""
"""

# Mock JSON data (multi-language)
MOCK_JSON_MULTILANG = """{
  "en": {
    "greeting": "Hello",
    "farewell": "Goodbye",
    "app": {
      "title": "My App",
      "version": "1.0"
    }
  },
  "es": {
    "greeting": "Hola",
    "farewell": "Adiós",
    "app": {
      "title": "Mi Aplicación",
      "version": "1.0"
    }
  }
}
"""

# Mock JSON data (single language)
MOCK_JSON_SINGLE = """{
  "en_US": {
    "greeting": "Hello",
    "farewell": "Goodbye",
    "menu": {
      "file": "File",
      "edit": "Edit",
      "help": "Help"
    }
  }
}
"""


# ============================================================================
# Test Functions
# ============================================================================

def demo_factory_detection():
    """Demonstrate file format detection."""
    print("\n" + "=" * 80)
    print("DEMO: Factory Pattern - File Format Detection")
    print("=" * 80)

    test_files = [
        "translation.xliff",
        "translation.sdxliff",
        "translation.po",
        "translation.json",
        "strings.mqxliff",
    ]

    for file_path in test_files:
        detected = ParserFactory.detect_format(file_path)
        is_supported = ParserFactory.is_supported(file_path)
        print(f"\n{file_path}")
        print(f"  Format: {detected}")
        print(f"  Supported: {is_supported}")


def demo_xliff_parsing():
    """Demonstrate XLIFF parsing."""
    print("\n" + "=" * 80)
    print("DEMO 1: XLIFF Parser Strategy")
    print("=" * 80)

    parser = ParserFactory.create("test.xliff")
    segments = parser.parse_string(MOCK_XLIFF)

    print(f"\nParsed {len(segments)} segments from XLIFF")
    for segment in segments:
        print(f"\n  ID: {segment.segment_id}")
        print(f"  Status: {segment.status.value}")
        print(f"  Source: {segment.source_text}")
        print(f"  Target: {segment.target_text}")


def demo_po_parsing():
    """Demonstrate PO parsing."""
    print("\n" + "=" * 80)
    print("DEMO 2: PO Parser Strategy")
    print("=" * 80)

    parser = ParserFactory.create("test.po")
    segments = parser.parse_string(MOCK_PO)

    print(f"\nParsed {len(segments)} segments from PO file")
    for segment in segments:
        print(f"\n  ID: {segment.segment_id}")
        print(f"  Status: {segment.status.value}")
        print(f"  Context: {segment.metadata.context}")
        print(f"  Source: {segment.source_text}")
        print(f"  Target: {segment.target_text}")

        # Show flags if present
        if "flags" in segment.metadata.custom_attributes:
            flags = segment.metadata.custom_attributes["flags"]
            if flags:
                print(f"  Flags: {flags}")


def demo_json_parsing():
    """Demonstrate JSON parsing."""
    print("\n" + "=" * 80)
    print("DEMO 3: JSON Parser Strategy (Multi-language)")
    print("=" * 80)

    parser = ParserFactory.create("test.json")
    segments = parser.parse_string(MOCK_JSON_MULTILANG)

    print(f"\nParsed {len(segments)} segments from JSON")
    for segment in segments[:3]:  # Show first 3
        print(f"\n  ID: {segment.segment_id}")
        print(f"  Context: {segment.metadata.context}")
        print(f"  Languages: {segment.source_language} → {segment.target_language}")
        print(f"  Source: {segment.source_text}")
        print(f"  Target: {segment.target_text}")

    if len(segments) > 3:
        print(f"\n  ... and {len(segments) - 3} more")


def demo_json_single_language():
    """Demonstrate JSON parsing (single language)."""
    print("\n" + "=" * 80)
    print("DEMO 4: JSON Parser Strategy (Single Language)")
    print("=" * 80)

    parser = ParserFactory.create("strings.json")
    segments = parser.parse_string(MOCK_JSON_SINGLE)

    print(f"\nParsed {len(segments)} segments from single-language JSON")
    for segment in segments[:3]:  # Show first 3
        print(f"\n  ID: {segment.segment_id}")
        print(f"  Context: {segment.metadata.context}")
        print(f"  Status: {segment.status.value}")
        print(f"  Text: {segment.source_text}")


def demo_qa_checking():
    """Demonstrate QA checking."""
    print("\n" + "=" * 80)
    print("DEMO 5: QA Checking on Parsed Segments")
    print("=" * 80)

    # Parse XLIFF with some issues
    parser = ParserFactory.create("test.xliff")
    segments = parser.parse_string(MOCK_XLIFF)

    # Create QA checker and run checks
    qa = QAChecker()
    issues = qa.check_segments(segments)

    print(f"\nFound {len(issues)} QA issues:")

    summary = qa.get_summary()
    print(f"\nSummary:")
    print(f"  Total Issues: {summary['total_issues']}")
    print(f"  Errors: {summary['errors']}")
    print(f"  Warnings: {summary['warnings']}")
    print(f"  Info: {summary['info']}")

    # Show issues by type
    print(f"\nIssues by type:")
    for issue_type, count in summary["by_type"].items():
        if count > 0:
            print(f"  {issue_type}: {count}")

    # Show specific issues
    if issues:
        print(f"\nDetailed Issues:")
        for issue in issues:
            print(f"\n  [{issue.severity.upper()}] {issue.segment_id}: {issue.message}")
            print(f"    Type: {issue.issue_type.value}")


def demo_custom_qa_rules():
    """Demonstrate custom QA rules."""
    print("\n" + "=" * 80)
    print("DEMO 6: Custom QA Rules")
    print("=" * 80)

    from ..qa import QAIssue, IssueSeverity

    # Parse segments
    parser = ParserFactory.create("test.xliff")
    segments = parser.parse_string(MOCK_XLIFF)

    # Create QA checker with custom rule
    qa = QAChecker()

    # Add custom rule: flag segments with very short translations
    def check_short_translation(segment):
        if segment.target_text and len(segment.target_text) < 3:
            return QAIssue(
                segment_id=segment.segment_id,
                issue_type=IssueType.CUSTOM,
                severity=IssueSeverity.WARNING,
                message="Translation is unusually short",
                source_text=segment.source_text,
                target_text=segment.target_text,
            )
        return None

    qa.add_custom_rule(check_short_translation)

    # Run checks
    issues = qa.check_segments(segments)

    print(f"\nFound {len(issues)} issues with custom rules")
    for issue in issues:
        print(f"  {issue}")


def demo_unified_interface():
    """Demonstrate unified interface across formats."""
    print("\n" + "=" * 80)
    print("DEMO 7: Unified Interface Across Formats")
    print("=" * 80)

    test_data = [
        ("XLIFF", MOCK_XLIFF),
        ("PO", MOCK_PO),
        ("JSON", MOCK_JSON_MULTILANG),
    ]

    for format_name, content in test_data:
        print(f"\n{format_name}:")

        # Create appropriate parser
        if format_name == "XLIFF":
            parser = ParserFactory.create("test.xliff")
        elif format_name == "PO":
            parser = ParserFactory.create("test.po")
        else:
            parser = ParserFactory.create("test.json")

        # Parse using same interface
        segments = parser.parse_string(content)

        # Count by status using same interface
        status_counts = {}
        for segment in segments:
            status = segment.status.value
            status_counts[status] = status_counts.get(status, 0) + 1

        print(f"  Total: {len(segments)} segments")
        for status, count in status_counts.items():
            print(f"    {status}: {count}")


def run_all_demos():
    """Run all demonstrations."""
    demo_factory_detection()
    demo_xliff_parsing()
    demo_po_parsing()
    demo_json_parsing()
    demo_json_single_language()
    demo_qa_checking()
    demo_custom_qa_rules()
    demo_unified_interface()


if __name__ == "__main__":
    run_all_demos()
