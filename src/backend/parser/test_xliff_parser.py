"""
Test suite and demonstrations for XLIFFParser.

Demonstrates parsing of:
  - Standard XLIFF 1.2
  - Standard XLIFF 2.0
  - SDL Trados (.sdxliff)
  - MemoQ (.mqxliff)
  - Complex inline tags and metadata
"""

from .xliff_parser import XLIFFParser
from .models import SegmentStatus


# Mock XLIFF 1.2 - Standard
MOCK_XLIFF_1_2_STANDARD = """<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="tr" datatype="plaintext">
    <body>
      <trans-unit id="1" xml:lang="en">
        <source>Hello, World!</source>
        <target state="translated">Merhaba, Dunya!</target>
      </trans-unit>
      <trans-unit id="2" xml:lang="en">
        <source>Welcome to our <g id="1" ctype="bold">application</g>.</source>
        <target state="translated">Uygulamiza hos geldiniz <g id="1" ctype="bold">application</g>.</target>
      </trans-unit>
      <trans-unit id="3" xml:lang="en">
        <source>This segment is not translated yet.</source>
        <target state="needs-translation"/>
      </trans-unit>
    </body>
  </file>
</xliff>
""".encode('utf-8')

# Mock XLIFF 2.0
MOCK_XLIFF_2_0 = """<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0">
  <file id="f1" source-language="en" target-language="de">
    <group id="g1">
      <unit id="unit1">
        <segment>
          <source>Please click the <x id="1"/> button.</source>
          <target state="translated">Bitte klicken Sie auf die <x id="1"/> Schaltflache.</target>
        </segment>
      </unit>
      <unit id="unit2">
        <segment>
          <source>Configuration complete</source>
          <target state="translated">Konfiguration abgeschlossen</target>
        </segment>
      </unit>
    </group>
  </file>
</xliff>
""".encode('utf-8')

# Mock SDL Trados XLIFF (.sdxliff)
MOCK_SDXLIFF_TRADOS = """<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2"
        xmlns:sdl="http://www.sdl.com/Trados/API/ContentHandler/ContentHandlerTypes">
  <file source-language="en" target-language="es" datatype="plaintext" sdl:segmentationrule="Default">
    <body>
      <trans-unit id="seg_1001" sdl:status="Translated" match-quality="100">
        <source>Welcome to the Translation QA Tool</source>
        <target>Bienvenido a la Herramienta de Control de Calidad de Traduccion</target>
        <prop prop-type="sdl:priority">2</prop>
      </trans-unit>
      <trans-unit id="seg_1002" sdl:status="Draft" match-quality="75">
        <source>This segment requires review</source>
        <target>Este segmento requiere revision</target>
      </trans-unit>
      <trans-unit id="seg_1003" translate="no" sdl:status="Locked">
        <source>Do not translate this message</source>
        <target/>
      </trans-unit>
      <trans-unit id="seg_1004" sdl:status="Translated">
        <source>Click <g id="1" ctype="bold">Save</g> to continue</source>
        <target>Haga clic en <g id="1" ctype="bold">Guardar</g> para continuar</target>
      </trans-unit>
    </body>
  </file>
</xliff>
""".encode('utf-8')

# Mock MemoQ XLIFF (.mqxliff)
MOCK_MQXLIFF_MEMOQ = """<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2"
        xmlns:mq="MemoQ" mq:version="9.8">
  <file source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="mq_001" mq:status="final" mq:confirmed="true">
        <source>Translate this content</source>
        <target state="signed-off">Traduire ce contenu</target>
      </trans-unit>
      <trans-unit id="mq_002" mq:status="working" mq:confirmed="false" match-quality="60">
        <source>In progress segment</source>
        <target state="needs-review">Segment en cours</target>
      </trans-unit>
      <trans-unit id="mq_003" mq:status="locked">
        <source>Context information</source>
        <target context="UI_Label">Informations de contexte</target>
      </trans-unit>
      <trans-unit id="mq_004">
        <source>Text with <mrk mtype="seg" mid="m1">marked segment</mrk></source>
        <target>Texte avec <mrk mtype="seg" mid="m1">segment marque</mrk></target>
      </trans-unit>
    </body>
  </file>
</xliff>
""".encode('utf-8')

# Complex XLIFF with multiple inline tags
MOCK_XLIFF_COMPLEX = """<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="ja" datatype="html">
    <body>
      <trans-unit id="complex_001">
        <source>Visit our <g id="1" ctype="link">website</g> for more <g id="2" ctype="bold">information</g>.
                 Call us at <x id="3" ctype="phone"/> or email <bx id="4" ctype="email"/>support@company.com<ex id="4"/>.</source>
        <target state="translated">Website nizi ziyaret edin ve daha fazla bilgi alin.
                 Bizi arayiniz: <x id="3" ctype="phone"/> veya support@company.com email gonderin.</target>
      </trans-unit>
      <trans-unit id="complex_002" confirmation-status="approved">
        <source>Product <ph id="5" ctype="product_name">{{PRODUCT_NAME}}</ph> is available now.</source>
        <target>Urun <ph id="5" ctype="product_name">{{PRODUCT_NAME}}</ph> sunulmus.</target>
      </trans-unit>
    </body>
  </file>
</xliff>
""".encode('utf-8')


def print_segment_info(segment) -> None:
    """Pretty print segment information."""
    print(f"\n{'=' * 80}")
    print(f"Segment ID: {segment.segment_id}")
    print(f"Status: {segment.status.value}")
    print(f"XLIFF Version: {segment.xliff_version} | Variant: {segment.variant}")
    print(f"Languages: {segment.source_language} -> {segment.target_language}")
    print(f"\nSource: {segment.source_text}")
    print(f"Target: {segment.target_text}")
    print(f"\nPlain Text:")
    print(f"  Source: {segment.source_plain_text}")
    print(f"  Target: {segment.target_plain_text}")

    if segment.source_inline_tags:
        print(f"\nSource Inline Tags ({len(segment.source_inline_tags)}):")
        for tag in segment.source_inline_tags:
            print(f"  - {tag.tag_type} (id={tag.tag_id}): {tag.content[:50]}")

    if segment.metadata.match_quality is not None:
        print(f"\nMetadata:")
        print(f"  Match Quality: {segment.metadata.match_quality}%")
        if segment.metadata.confirmation_status:
            print(f"  Confirmation: {segment.metadata.confirmation_status}")
        if segment.metadata.segment_status:
            print(f"  Segment Status: {segment.metadata.segment_status}")


def demo_standard_xliff_1_2() -> None:
    """Demonstrate parsing standard XLIFF 1.2."""
    print("\n" + "=" * 80)
    print("DEMO 1: Standard XLIFF 1.2")
    print("=" * 80)

    parser = XLIFFParser()
    segments = parser.parse_string(MOCK_XLIFF_1_2_STANDARD)

    print(f"Detected Version: {parser.xliff_version}")
    print(f"Detected Variant: {parser.detected_variant}")
    print(f"Total Segments: {len(segments)}\n")

    for segment in segments:
        print_segment_info(segment)


def demo_xliff_2_0() -> None:
    """Demonstrate parsing XLIFF 2.0."""
    print("\n" + "=" * 80)
    print("DEMO 2: XLIFF 2.0")
    print("=" * 80)

    parser = XLIFFParser()
    segments = parser.parse_string(MOCK_XLIFF_2_0)

    print(f"Detected Version: {parser.xliff_version}")
    print(f"Detected Variant: {parser.detected_variant}")
    print(f"Total Segments: {len(segments)}\n")

    for segment in segments:
        print_segment_info(segment)


def demo_trados_sdxliff() -> None:
    """Demonstrate parsing SDL Trados XLIFF."""
    print("\n" + "=" * 80)
    print("DEMO 3: SDL Trados XLIFF (.sdxliff)")
    print("=" * 80)

    parser = XLIFFParser()
    segments = parser.parse_string(MOCK_SDXLIFF_TRADOS)

    print(f"Detected Version: {parser.xliff_version}")
    print(f"Detected Variant: {parser.detected_variant}")
    print(f"Total Segments: {len(segments)}\n")

    for segment in segments:
        print_segment_info(segment)


def demo_memoq_mqxliff() -> None:
    """Demonstrate parsing MemoQ XLIFF."""
    print("\n" + "=" * 80)
    print("DEMO 4: MemoQ XLIFF (.mqxliff)")
    print("=" * 80)

    parser = XLIFFParser()
    segments = parser.parse_string(MOCK_MQXLIFF_MEMOQ)

    print(f"Detected Version: {parser.xliff_version}")
    print(f"Detected Variant: {parser.detected_variant}")
    print(f"Total Segments: {len(segments)}\n")

    for segment in segments:
        print_segment_info(segment)


def demo_complex_inline_tags() -> None:
    """Demonstrate parsing complex inline tags and metadata."""
    print("\n" + "=" * 80)
    print("DEMO 5: Complex Inline Tags and Metadata")
    print("=" * 80)

    parser = XLIFFParser()
    segments = parser.parse_string(MOCK_XLIFF_COMPLEX)

    print(f"Detected Version: {parser.xliff_version}")
    print(f"Total Segments: {len(segments)}\n")

    for segment in segments:
        print_segment_info(segment)


def demo_segment_serialization() -> None:
    """Demonstrate segment serialization to dictionary."""
    print("\n" + "=" * 80)
    print("DEMO 6: Segment Serialization")
    print("=" * 80)

    parser = XLIFFParser()
    segments = parser.parse_string(MOCK_XLIFF_1_2_STANDARD)

    if segments:
        segment = segments[0]
        print("\nSegment as Dictionary:")
        import json

        segment_dict = segment.to_dict()
        print(json.dumps(segment_dict, indent=2, ensure_ascii=False))


def run_all_demos() -> None:
    """Run all demonstration examples."""
    demo_standard_xliff_1_2()
    demo_xliff_2_0()
    demo_trados_sdxliff()
    demo_memoq_mqxliff()
    demo_complex_inline_tags()
    demo_segment_serialization()


if __name__ == "__main__":
    run_all_demos()
