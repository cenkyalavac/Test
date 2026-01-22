"""
Translation Package Extractor

Extracts translation files from proprietary package formats:
- .xlz (Lionbridge) - contains .xlf or .xliff files
- .wsxz (Trados WorldServer) - contains .sdlxliff files
- .sdlppx / .sdlrpx (Trados Project) - contains .sdlxliff in language folders
- .mqout (MemoQ) - contains .mqxliff or .xlf files

Uses Python's zipfile module for extraction.
"""

import zipfile
import io
from typing import Dict, List, Tuple, Optional
from pathlib import Path


class PackageExtractorError(Exception):
    """Raised when package extraction fails."""
    pass


class PackageExtractor:
    """Extracts translation files from proprietary package formats."""

    # File extensions to search for in packages
    SUPPORTED_EXTENSIONS = {
        '.xlf': 'XLIFF 1.0',
        '.xliff': 'XLIFF',
        '.sdlxliff': 'SDL Trados XLIFF',
        '.mqxliff': 'MemoQ XLIFF',
        '.content': 'Lionbridge Content',
    }

    # Package format signatures
    PACKAGE_FORMATS = {
        '.xlz': 'Lionbridge XLIFF Package',
        '.wsxz': 'Trados WorldServer Package',
        '.sdlppx': 'Trados Project Package',
        '.sdlrpx': 'Trados Return Package',
        '.mqout': 'MemoQ Output Package',
    }

    def __init__(self):
        """Initialize the package extractor."""
        self.extracted_files: Dict[str, bytes] = {}
        self.file_metadata: Dict[str, Dict] = {}

    def extract_translation_files(
        self, file_stream: io.BytesIO, filename: str
    ) -> Tuple[Dict[str, bytes], Dict[str, Dict]]:
        """
        Extract translation files from a package.

        Args:
            file_stream: BytesIO stream of the package file
            filename: Name of the package file (used to determine format)

        Returns:
            Tuple of (extracted_files_dict, metadata_dict)
            - extracted_files_dict: {filename: content_bytes}
            - metadata_dict: {filename: {format, language, path, ...}}

        Raises:
            PackageExtractorError: If extraction fails
        """
        self.extracted_files.clear()
        self.file_metadata.clear()

        file_ext = Path(filename).suffix.lower()

        if file_ext not in self.PACKAGE_FORMATS:
            raise PackageExtractorError(
                f"Unsupported package format: {file_ext}. "
                f"Supported: {', '.join(self.PACKAGE_FORMATS.keys())}"
            )

        try:
            with zipfile.ZipFile(file_stream, 'r') as zip_file:
                if file_ext == '.xlz':
                    self._extract_xlz(zip_file)
                elif file_ext == '.wsxz':
                    self._extract_wsxz(zip_file)
                elif file_ext in {'.sdlppx', '.sdlrpx'}:
                    self._extract_trados_project(zip_file)
                elif file_ext == '.mqout':
                    self._extract_mqout(zip_file)

        except zipfile.BadZipFile as e:
            raise PackageExtractorError(f"Invalid ZIP file: {e}")
        except Exception as e:
            raise PackageExtractorError(f"Extraction failed: {e}")

        if not self.extracted_files:
            raise PackageExtractorError(
                f"No translation files found in {filename}. "
                f"Expected file formats: {', '.join(self.SUPPORTED_EXTENSIONS.keys())}"
            )

        return self.extracted_files, self.file_metadata

    def _extract_xlz(self, zip_file: zipfile.ZipFile) -> None:
        """
        Extract translation files from Lionbridge .xlz package.

        Searches for .xlf, .xliff, or .content files.
        """
        for name in zip_file.namelist():
            file_path = Path(name)
            ext = file_path.suffix.lower()

            if ext in {'.xlf', '.xliff', '.content'}:
                content = zip_file.read(name)
                clean_name = file_path.name
                self.extracted_files[clean_name] = content
                self.file_metadata[clean_name] = {
                    'format': 'Lionbridge',
                    'original_path': name,
                    'file_type': self.SUPPORTED_EXTENSIONS.get(ext, 'Unknown'),
                }

    def _extract_wsxz(self, zip_file: zipfile.ZipFile) -> None:
        """
        Extract translation files from Trados WorldServer .wsxz package.

        Searches for .sdlxliff files throughout the archive.
        """
        for name in zip_file.namelist():
            file_path = Path(name)

            if file_path.suffix.lower() == '.sdlxliff':
                content = zip_file.read(name)
                clean_name = file_path.name

                # Extract language from path if possible (e.g., /de-DE/file.sdlxliff)
                language = self._extract_language_from_path(name)

                self.extracted_files[clean_name] = content
                self.file_metadata[clean_name] = {
                    'format': 'Trados WorldServer',
                    'original_path': name,
                    'file_type': 'SDL Trados XLIFF',
                    'language': language,
                }

    def _extract_trados_project(self, zip_file: zipfile.ZipFile) -> None:
        """
        Extract translation files from Trados Project (.sdlppx, .sdlrpx).

        Looks for .sdlxliff files, typically in language-specific folders
        (e.g., target-language/[language-code]/file.sdlxliff).
        """
        target_lang_prefix = 'target-language'

        for name in zip_file.namelist():
            file_path = Path(name)

            if file_path.suffix.lower() == '.sdlxliff':
                content = zip_file.read(name)
                clean_name = file_path.name

                # Extract language code from path structure
                # Usually: target-language/de-DE/file.sdlxliff
                language = None
                parts = file_path.parts
                if target_lang_prefix in parts:
                    idx = parts.index(target_lang_prefix)
                    if idx + 1 < len(parts):
                        language = parts[idx + 1]

                self.extracted_files[clean_name] = content
                self.file_metadata[clean_name] = {
                    'format': 'Trados Project',
                    'original_path': name,
                    'file_type': 'SDL Trados XLIFF',
                    'language': language,
                }

    def _extract_mqout(self, zip_file: zipfile.ZipFile) -> None:
        """
        Extract translation files from MemoQ .mqout package.

        Searches for .mqxliff or .xlf files.
        """
        for name in zip_file.namelist():
            file_path = Path(name)
            ext = file_path.suffix.lower()

            if ext in {'.mqxliff', '.xlf'}:
                content = zip_file.read(name)
                clean_name = file_path.name

                # Extract language from path if possible
                language = self._extract_language_from_path(name)

                self.extracted_files[clean_name] = content
                self.file_metadata[clean_name] = {
                    'format': 'MemoQ',
                    'original_path': name,
                    'file_type': self.SUPPORTED_EXTENSIONS.get(ext, 'Unknown'),
                    'language': language,
                }

    @staticmethod
    def _extract_language_from_path(path: str) -> Optional[str]:
        """
        Try to extract language code from file path.

        Looks for common patterns like:
        - /de-DE/file.xlf
        - /target/de/file.xlf
        - /translations/fr-FR/file.xlf
        """
        parts = Path(path).parts

        for i, part in enumerate(parts):
            # Check for language code patterns (e.g., de-DE, fr-FR, es, en-US)
            if '-' in part and len(part) in {2, 5}:  # de, de-DE, de-CH, etc.
                if part.replace('-', '').isalpha():
                    return part
            # Check for single letter language codes
            elif len(part) == 2 and part.isalpha() and part.islower():
                return part

        return None

    def merge_segments(
        self, segments_list: List[List[Dict]], package_metadata: Dict[str, Dict]
    ) -> List[Dict]:
        """
        Merge segments from multiple files into a single list.

        Args:
            segments_list: List of segment lists from each file
            package_metadata: Metadata about extracted files

        Returns:
            Merged list of segments with file information
        """
        merged = []
        file_index = 0

        for segments, file_info in zip(segments_list, package_metadata.values()):
            for segment in segments:
                # Add file context to each segment
                segment_copy = segment.copy()
                segment_copy['_source_file'] = file_info.get('original_path', 'unknown')
                segment_copy['_package_format'] = file_info.get('format', 'unknown')
                segment_copy['_file_index'] = file_index
                merged.append(segment_copy)

            file_index += 1

        return merged

    @staticmethod
    def is_package_file(filename: str) -> bool:
        """Check if a file is a supported package format."""
        ext = Path(filename).suffix.lower()
        return ext in PackageExtractor.PACKAGE_FORMATS
