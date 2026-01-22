"""
Quality Assurance checker for translation segments.

Performs automated checks on parsed segments:
- Empty target detection
- Tag mismatch detection
- Language consistency
- Length ratio checks
- Custom rule engine
"""

from dataclasses import dataclass, field
from typing import List, Optional, Callable
from enum import Enum

from ..parser.models import Segment, SegmentStatus


class IssueSeverity(str, Enum):
    """Issue severity levels."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class IssueType(str, Enum):
    """Types of QA issues."""
    EMPTY_TARGET = "empty_target"
    TAG_MISMATCH = "tag_mismatch"
    LENGTH_RATIO = "length_ratio"
    UNTRANSLATED = "untranslated"
    FUZZY = "fuzzy"
    CUSTOM = "custom"


@dataclass
class QAIssue:
    """Represents a quality assurance issue found in a segment."""

    segment_id: str
    issue_type: IssueType
    severity: IssueSeverity
    message: str
    source_text: Optional[str] = None
    target_text: Optional[str] = None
    details: dict = field(default_factory=dict)

    def __str__(self) -> str:
        return f"[{self.severity.upper()}] {self.segment_id}: {self.message}"


class QAChecker:
    """
    Quality Assurance checker for translation segments.

    Provides automated quality checks to identify potential issues
    in translations.
    """

    def __init__(self):
        """Initialize QA checker."""
        self.issues: List[QAIssue] = []
        self.custom_rules: List[Callable[[Segment], Optional[QAIssue]]] = []

    def check_segments(self, segments: List[Segment]) -> List[QAIssue]:
        """
        Perform QA checks on segments.

        Args:
            segments: List of segments to check

        Returns:
            List of QA issues found
        """
        self.issues = []

        for segment in segments:
            self._check_segment(segment)

        return self.issues

    def _check_segment(self, segment: Segment) -> None:
        """Perform all checks on a single segment."""
        # Check for empty target
        if self._has_empty_target(segment):
            self.issues.append(
                QAIssue(
                    segment_id=segment.segment_id,
                    issue_type=IssueType.EMPTY_TARGET,
                    severity=IssueSeverity.ERROR,
                    message="Target text is empty",
                    source_text=segment.source_text,
                    target_text=segment.target_text,
                )
            )

        # Check for tag mismatch
        tag_mismatch = self._check_tag_mismatch(segment)
        if tag_mismatch:
            self.issues.append(tag_mismatch)

        # Check for fuzzy status
        if self._is_fuzzy(segment):
            self.issues.append(
                QAIssue(
                    segment_id=segment.segment_id,
                    issue_type=IssueType.FUZZY,
                    severity=IssueSeverity.WARNING,
                    message="Segment marked as fuzzy (needs review)",
                    source_text=segment.source_text,
                    target_text=segment.target_text,
                )
            )

        # Check length ratio
        ratio_issue = self._check_length_ratio(segment)
        if ratio_issue:
            self.issues.append(ratio_issue)

        # Run custom rules
        for rule in self.custom_rules:
            try:
                issue = rule(segment)
                if issue:
                    self.issues.append(issue)
            except Exception as e:
                # Don't let custom rules break the checker
                pass

    def _has_empty_target(self, segment: Segment) -> bool:
        """Check if target is empty when source is not."""
        source_empty = not segment.source_text or not segment.source_text.strip()
        target_empty = not segment.target_text or not segment.target_text.strip()

        # Error if source has content but target is empty
        return not source_empty and target_empty

    def _check_tag_mismatch(self, segment: Segment) -> Optional[QAIssue]:
        """
        Check for mismatched inline tags between source and target.

        Detects cases where source has tags but target doesn't, or vice versa.
        """
        source_tag_count = len(segment.source_inline_tags)
        target_tag_count = len(segment.target_inline_tags)

        if source_tag_count > 0 and target_tag_count == 0:
            return QAIssue(
                segment_id=segment.segment_id,
                issue_type=IssueType.TAG_MISMATCH,
                severity=IssueSeverity.WARNING,
                message=f"Source has {source_tag_count} inline tags but target has none",
                source_text=segment.source_text,
                target_text=segment.target_text,
                details={
                    "source_tag_count": source_tag_count,
                    "target_tag_count": target_tag_count,
                },
            )

        if source_tag_count != target_tag_count and source_tag_count > 0:
            return QAIssue(
                segment_id=segment.segment_id,
                issue_type=IssueType.TAG_MISMATCH,
                severity=IssueSeverity.WARNING,
                message=f"Tag count mismatch: source={source_tag_count}, target={target_tag_count}",
                source_text=segment.source_text,
                target_text=segment.target_text,
                details={
                    "source_tag_count": source_tag_count,
                    "target_tag_count": target_tag_count,
                },
            )

        return None

    def _is_fuzzy(self, segment: Segment) -> bool:
        """Check if segment is marked as fuzzy/needs review."""
        return segment.status == SegmentStatus.NEEDS_REVIEW

    def _check_length_ratio(self, segment: Segment) -> Optional[QAIssue]:
        """
        Check if source and target length ratio is reasonable.

        Some languages are more concise/verbose than others.
        Flag extreme differences.
        """
        source_len = len(segment.source_text)
        target_len = len(segment.target_text)

        if source_len == 0 or target_len == 0:
            return None

        ratio = target_len / source_len

        # Flag if target is dramatically shorter or longer
        if ratio < 0.3:  # Less than 30% of source length
            return QAIssue(
                segment_id=segment.segment_id,
                issue_type=IssueType.LENGTH_RATIO,
                severity=IssueSeverity.INFO,
                message=f"Target is significantly shorter than source ({ratio:.1%})",
                source_text=segment.source_text,
                target_text=segment.target_text,
                details={"ratio": ratio, "source_len": source_len, "target_len": target_len},
            )

        if ratio > 3.0:  # More than 3x source length
            return QAIssue(
                segment_id=segment.segment_id,
                issue_type=IssueType.LENGTH_RATIO,
                severity=IssueSeverity.INFO,
                message=f"Target is significantly longer than source ({ratio:.1%})",
                source_text=segment.source_text,
                target_text=segment.target_text,
                details={"ratio": ratio, "source_len": source_len, "target_len": target_len},
            )

        return None

    def add_custom_rule(self, rule: Callable[[Segment], Optional[QAIssue]]) -> None:
        """
        Add a custom QA rule.

        Rule should be a function that takes a Segment and returns
        a QAIssue if there's a problem, or None if OK.

        Args:
            rule: Custom rule function
        """
        self.custom_rules.append(rule)

    def clear_custom_rules(self) -> None:
        """Clear all custom rules."""
        self.custom_rules = []

    def get_issues_by_severity(self, severity: IssueSeverity) -> List[QAIssue]:
        """Get issues filtered by severity."""
        return [issue for issue in self.issues if issue.severity == severity]

    def get_issues_by_type(self, issue_type: IssueType) -> List[QAIssue]:
        """Get issues filtered by type."""
        return [issue for issue in self.issues if issue.issue_type == issue_type]

    def get_summary(self) -> dict:
        """Get summary of issues found."""
        return {
            "total_issues": len(self.issues),
            "errors": len(self.get_issues_by_severity(IssueSeverity.ERROR)),
            "warnings": len(self.get_issues_by_severity(IssueSeverity.WARNING)),
            "info": len(self.get_issues_by_severity(IssueSeverity.INFO)),
            "by_type": {
                issue_type.value: len(self.get_issues_by_type(issue_type))
                for issue_type in IssueType
            },
        }
