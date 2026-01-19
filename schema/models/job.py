"""
Job Model

Represents a single task within a project (typically one target language).
Has Many-to-One relationship with Project.

CRUCIAL: The external_vendor_id field stores ONLY the ID from external VMS.
         It must NOT store vendor names or addresses.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy import (
    CHAR,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin
from .enums import JobStatus, ServiceType

if TYPE_CHECKING:
    from .finance import FinanceItem
    from .project import Project


class Job(Base, UUIDMixin, TimestampMixin):
    """
    Job entity representing a single task within a project.

    Typically represents one target language translation task.

    CRUCIAL: external_vendor_id stores ONLY the ID from an external
             Vendor Management System (VMS). It must NOT store vendor
             names, addresses, or any other PII. Only the external system
             reference ID is permitted.

    Attributes:
        project_id: FK to parent Project (required)
        job_number: Human-readable ID within project (e.g., "PRJ-2024-00001-DE")
        target_language: ISO 639-1 code for target language
        external_vendor_id: External VMS reference ID (STRING - NO vendor PII!)
        service_type: Type of service for this job
        status: Current job status
    """

    __tablename__ = "job"

    # Relationships
    project_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Core fields
    job_number: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(500))

    # Language
    target_language: Mapped[str] = mapped_column(
        CHAR(5),
        nullable=False,
        index=True,
    )

    # =========================================================================
    # CRUCIAL: External Vendor Reference
    # =========================================================================
    # This field stores ONLY the ID from an external Vendor Management System.
    # It must NOT store:
    #   - Vendor names
    #   - Vendor addresses
    #   - Contact information
    #   - Any other vendor PII
    #
    # The external VMS is the source of truth for vendor details.
    # This field is purely a reference/lookup key.
    # =========================================================================
    external_vendor_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        doc="External VMS reference ID only. DO NOT store vendor names or addresses.",
    )

    # Service details
    service_type: Mapped[ServiceType] = mapped_column(
        Enum(ServiceType, name="service_type", create_type=False),
        nullable=False,
        default=ServiceType.TEP,
    )

    # Volume
    source_words: Mapped[int] = mapped_column(Integer, default=0)
    weighted_words: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
    )

    # Word count breakdown for this job
    word_count_breakdown: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default="{}",
    )

    # Timeline
    assigned_at: Mapped[Optional[datetime]] = mapped_column()
    deadline: Mapped[Optional[datetime]] = mapped_column(index=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column()

    # Rates (snapshot at time of assignment)
    rate_per_word: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4))
    rate_currency: Mapped[str] = mapped_column(CHAR(3), default="USD")

    # Calculated cost
    estimated_cost: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
    )
    actual_cost: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
    )

    # Status
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status"),
        nullable=False,
        default=JobStatus.PENDING,
        index=True,
    )

    # Quality metrics
    quality_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        doc="Quality score from 0-100",
    )

    # Metadata
    instructions: Mapped[Optional[str]] = mapped_column(Text)
    metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default="{}",
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="jobs",
    )

    finance_items: Mapped[list["FinanceItem"]] = relationship(
        "FinanceItem",
        back_populates="job",
        cascade="all, delete-orphan",
        foreign_keys="FinanceItem.job_id",
    )

    __table_args__ = (
        UniqueConstraint("project_id", "job_number", name="uq_job_number"),
        Index("idx_job_status", "status"),
        Index("idx_job_external_vendor", "external_vendor_id"),
        Index("idx_job_deadline", "deadline"),
    )

    def __repr__(self) -> str:
        return (
            f"<Job(id={self.id}, number='{self.job_number}', "
            f"lang={self.target_language.strip()}, status={self.status.value})>"
        )

    @property
    def is_assigned(self) -> bool:
        """Check if job has been assigned to a vendor."""
        return self.external_vendor_id is not None and self.assigned_at is not None

    @property
    def is_overdue(self) -> bool:
        """Check if job is past deadline and not delivered."""
        if self.deadline is None or self.delivered_at is not None:
            return False
        return datetime.utcnow() > self.deadline

    def calculate_cost(self) -> Decimal:
        """Calculate estimated cost based on weighted words and rate."""
        if self.rate_per_word is None:
            return Decimal("0")
        return self.weighted_words * self.rate_per_word

    def assign_to_vendor(self, vendor_id: str) -> None:
        """
        Assign this job to an external vendor.

        Args:
            vendor_id: The external VMS reference ID (NOT vendor name/address!)
        """
        self.external_vendor_id = vendor_id
        self.assigned_at = datetime.utcnow()
        self.status = JobStatus.ASSIGNED

    def mark_delivered(self) -> None:
        """Mark this job as delivered."""
        self.delivered_at = datetime.utcnow()
        self.status = JobStatus.DELIVERED

    def set_word_breakdown(
        self,
        breakdown: dict[str, int],
        price_profile: Any = None,
    ) -> None:
        """
        Set word count breakdown and calculate weighted words.

        Args:
            breakdown: Dict mapping match types to word counts
            price_profile: Optional PriceProfile to calculate weighted words
        """
        self.word_count_breakdown = breakdown
        self.source_words = sum(breakdown.values())

        if price_profile is not None:
            self.weighted_words = price_profile.calculate_weighted_words(breakdown)
        else:
            # Default: use source words as weighted words
            self.weighted_words = Decimal(str(self.source_words))

        # Recalculate cost
        self.estimated_cost = self.calculate_cost()
