"""
Zip File Extractor for Translation Files

Handles recursive extraction of zip archives (including nested zips like xlz, wsxz).
Supports safe decompression with size limits to prevent malicious archives.
"""

import zipfile
import io
from typing import Dict, List, Tuple, Optional
from pathlib import Path


class ZipExtractorError(Exception):
    """Raised when zip extraction fails."""
    pass


class ZipExtractor:
    """Extracts translation files from zip archives with nested zip support."""

    # Maximum sizes to prevent malicious archives
    MAX_TOTAL_SIZE = 500 * 1024 * 1024  # 500 MB total
    MAX_SINGLE_FILE = 100 * 1024 * 1024  # 100 MB per file
    MAX_EXTRACTION_DEPTH = 5  # Maximum nesting level

    # File extensions that are translation files
    TRANSLATION_EXTENSIONS = {
        '.xlf', '.xliff', '.xml',
        '.po', '.json', '.yaml', '.yml',
        '.csv', '.properties',
        '.sdlxliff', '.mqxliff', '.mxliff',
        '.content'
    }

    # Archive extensions that might be nested
    ARCHIVE_EXTENSIONS = {
        '.zip', '.xlz', '.wsxz',
        '.sdlppx', '.sdlrpx', '.mqout'
    }

    def __init__(self):
        """Initialize the zip extractor."""
        self.extracted_files: Dict[str, bytes] = {}
        self.file_metadata: Dict[str, Dict] = {}
        self.total_extracted_size = 0

    def extract_files(
        self, file_stream: io.BytesIO, filename: str
    ) -> Tuple[Dict[str, bytes], Dict[str, Dict]]:
        """
        Extract translation files from a zip archive (recursive).

        Args:
            file_stream: BytesIO stream of the zip file
            filename: Name of the zip file

        Returns:
            Tuple of (extracted_files_dict, metadata_dict)
            - extracted_files_dict: {filename: content_bytes}
            - metadata_dict: {filename: {original_path, depth, nested_in, ...}}

        Raises:
            ZipExtractorError: If extraction fails or limits exceeded
        """
        self.extracted_files.clear()
        self.file_metadata.clear()
        self.total_extracted_size = 0

        try:
            self._extract_recursive(file_stream, filename, depth=0, parent_path="")
        except ZipExtractorError:
            raise
        except Exception as e:
            raise ZipExtractorError(f"Extraction failed: {e}")

        if not self.extracted_files:
            raise ZipExtractorError(
                f"No translation files found in {filename}. "
                f"Supported formats: {', '.join(self.TRANSLATION_EXTENSIONS)}"
            )

        return self.extracted_files, self.file_metadata

    def _extract_recursive(
        self,
        file_stream: io.BytesIO,
        filename: str,
        depth: int = 0,
        parent_path: str = ""
    ) -> None:
        """
        Recursively extract zip files, handling nested archives.

        Args:
            file_stream: BytesIO stream to extract
            filename: Name of current file being extracted
            depth: Current nesting depth
            parent_path: Path of parent archive for metadata
        """
        if depth > self.MAX_EXTRACTION_DEPTH:
            raise ZipExtractorError(
                f"Maximum extraction depth ({self.MAX_EXTRACTION_DEPTH}) exceeded. "
                "Possible zip bomb attack."
            )

        try:
            with zipfile.ZipFile(file_stream, 'r') as zip_file:
                for info in zip_file.infolist():
                    # Skip directories
                    if info.filename.endswith('/'):
                        continue

                    # Check uncompressed size
                    if info.file_size > self.MAX_SINGLE_FILE:
                        raise ZipExtractorError(
                            f"File {info.filename} too large ({info.file_size} bytes). "
                            f"Maximum: {self.MAX_SINGLE_FILE // 1024 // 1024}MB"
                        )

                    # Check total size
                    if self.total_extracted_size + info.file_size > self.MAX_TOTAL_SIZE:
                        raise ZipExtractorError(
                            f"Total extraction size exceeded. Maximum: {self.MAX_TOTAL_SIZE // 1024 // 1024}MB"
                        )

                    content = zip_file.read(info.filename)
                    self.total_extracted_size += len(content)

                    file_path = Path(info.filename)
                    ext = file_path.suffix.lower()

                    # Check if this is a nested archive
                    if ext in self.ARCHIVE_EXTENSIONS:
                        try:
                            nested_stream = io.BytesIO(content)
                            nested_parent = f"{parent_path}/{filename}" if parent_path else filename
                            self._extract_recursive(
                                nested_stream,
                                file_path.name,
                                depth=depth + 1,
                                parent_path=nested_parent
                            )
                        except ZipExtractorError:
                            raise
                        except Exception as e:
                            # Log but continue if nested extraction fails
                            print(f"Warning: Failed to extract nested archive {info.filename}: {e}")

                    # If it's a translation file, extract it
                    elif ext in self.TRANSLATION_EXTENSIONS:
                        clean_name = file_path.name

                        # Handle filename collisions by appending depth info
                        if clean_name in self.extracted_files:
                            base_name = file_path.stem
                            clean_name = f"{base_name}_L{depth}{file_path.suffix}"

                        self.extracted_files[clean_name] = content
                        self.file_metadata[clean_name] = {
                            'original_path': info.filename,
                            'depth': depth,
                            'nested_in': parent_path if parent_path else None,
                            'size': len(content),
                            'compressed_size': info.compress_size,
                        }

        except zipfile.BadZipFile as e:
            raise ZipExtractorError(f"Invalid ZIP file: {e}")

    @staticmethod
    def is_regular_zip(filename: str) -> bool:
        """Check if file is a regular zip (not a proprietary format)."""
        ext = Path(filename).suffix.lower()
        return ext == '.zip'
