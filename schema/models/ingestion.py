"""
Ingestion Failure Log Model

Tracks failed webhook ingestions for debugging and resolution.
Used by BeLazy integration and other external data sources.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, UUIDMixin


class IngestionFailureLog(Base, UUIDMixin):
    """
    Log entry for failed webhook/API ingestions.

    Used to track failures from external systems like BeLazy,
    allowing for debugging and manual resolution of issues.

    Attributes:
        source_system: Identifier for the source (e.g., 'belazy')
        raw_payload: Complete raw payload for debugging
        error_message: Description of what went wrong
        is_resolved: Whether the issue has been addressed
    """

    __tablename__ = "ingestion_failure_log"

    # Source identification
    source_system: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    # Raw payload for debugging
    raw_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )

    # Error details
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    error_stack: Mapped[Optional[str]] = mapped_column(Text)

    # Resolution tracking
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column()
    resolved_by: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True))
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text)

    # If eventually successful, link to created project
    resulting_project_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("project.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    resulting_project = relationship("Project")

    __table_args__ = (
        Index(
            "idx_ingestion_failure_unresolved",
            "is_resolved",
            postgresql_where=(~is_resolved),
        ),
    )

    def __repr__(self) -> str:
        status = "resolved" if self.is_resolved else "pending"
        return f"<IngestionFailureLog(id={self.id}, source={self.source_system}, status={status})>"

    def mark_resolved(
        self,
        resolved_by: Optional[UUID] = None,
        notes: Optional[str] = None,
        project_id: Optional[UUID] = None,
    ) -> None:
        """
        Mark this failure as resolved.

        Args:
            resolved_by: UUID of user who resolved the issue
            notes: Resolution notes
            project_id: ID of project created after resolution
        """
        self.is_resolved = True
        self.resolved_at = datetime.utcnow()
        self.resolved_by = resolved_by
        self.resolution_notes = notes
        if project_id:
            self.resulting_project_id = project_id

    @classmethod
    def log_failure(
        cls,
        source_system: str,
        payload: dict[str, Any],
        error_message: str,
        error_stack: Optional[str] = None,
    ) -> "IngestionFailureLog":
        """
        Factory method to create a failure log entry.

        Args:
            source_system: Source identifier (e.g., 'belazy')
            payload: Raw payload that caused the failure
            error_message: Error description
            error_stack: Optional stack trace

        Returns:
            New IngestionFailureLog instance
        """
        return cls(
            source_system=source_system,
            raw_payload=payload,
            error_message=error_message,
            error_stack=error_stack,
        )
