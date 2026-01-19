"""
Project Model

Core entity representing a translation project.
Has Many-to-One relationship with Account.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy import (
    ARRAY,
    CHAR,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin
from .enums import ProjectStatus, ServiceType

if TYPE_CHECKING:
    from .account import Account
    from .finance import FinanceItem
    from .job import Job


class Project(Base, UUIDMixin, TimestampMixin):
    """
    Translation Project entity.

    Represents a client project containing one or more jobs.
    Each job typically handles one target language.

    Attributes:
        account_id: FK to the client Account (required)
        project_number: Human-readable ID (e.g., "PRJ-2024-00001")
        source_language: ISO 639-1 code for source language
        service_type: Type of service (TEP, MTPE, etc.)
        status: Current project status
    """

    __tablename__ = "project"

    # Relationships
    account_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("account.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Core fields
    project_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # External references
    client_reference: Mapped[Optional[str]] = mapped_column(String(255))
    external_project_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        index=True,
    )
    source_system: Mapped[Optional[str]] = mapped_column(
        String(100),
        index=True,
    )

    # Language settings
    source_language: Mapped[str] = mapped_column(CHAR(5), nullable=False)

    # Service and workflow
    service_type: Mapped[ServiceType] = mapped_column(
        Enum(ServiceType, name="service_type", create_type=False),
        nullable=False,
        default=ServiceType.TEP,
    )

    # Timeline
    received_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    deadline: Mapped[Optional[datetime]] = mapped_column(index=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column()

    # Volume (aggregated from jobs)
    total_source_words: Mapped[int] = mapped_column(Integer, default=0)
    total_weighted_words: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
    )

    # Word count breakdown (from CAT analysis)
    word_count_breakdown: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default="{}",
    )

    # Financial summary (cached)
    estimated_revenue: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
    )
    actual_revenue: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
    )
    estimated_cost: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
    )
    actual_cost: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
    )
    currency_code: Mapped[str] = mapped_column(CHAR(3), default="USD")

    # Status
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status"),
        nullable=False,
        default=ProjectStatus.DRAFT,
        index=True,
    )

    # Metadata
    tags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String))
    metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default="{}",
    )

    # Audit
    created_by: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True))

    # Relationships
    account: Mapped["Account"] = relationship(
        "Account",
        back_populates="projects",
    )

    jobs: Mapped[list["Job"]] = relationship(
        "Job",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="Job.target_language",
    )

    finance_items: Mapped[list["FinanceItem"]] = relationship(
        "FinanceItem",
        back_populates="project",
        cascade="all, delete-orphan",
        foreign_keys="FinanceItem.project_id",
    )

    __table_args__ = (
        Index("idx_project_status", "status"),
        Index("idx_project_deadline", "deadline"),
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, number='{self.project_number}', status={self.status.value})>"

    @property
    def target_languages(self) -> list[str]:
        """Get list of all target languages from jobs."""
        return list(set(job.target_language.strip() for job in self.jobs))

    @property
    def job_count(self) -> int:
        """Get number of jobs in this project."""
        return len(self.jobs)

    @property
    def estimated_margin(self) -> Decimal:
        """Calculate estimated margin (revenue - cost)."""
        return self.estimated_revenue - self.estimated_cost

    @property
    def margin_percentage(self) -> Decimal:
        """Calculate margin as percentage of revenue."""
        if self.estimated_revenue > 0:
            return (self.estimated_margin / self.estimated_revenue) * 100
        return Decimal("0")

    @property
    def is_overdue(self) -> bool:
        """Check if project is past deadline and not delivered."""
        if self.deadline is None or self.delivered_at is not None:
            return False
        return datetime.utcnow() > self.deadline

    def recalculate_totals(self) -> None:
        """Recalculate aggregated totals from jobs."""
        self.total_source_words = sum(job.source_words or 0 for job in self.jobs)
        self.total_weighted_words = sum(
            job.weighted_words or Decimal("0") for job in self.jobs
        )
        self.estimated_cost = sum(
            job.estimated_cost or Decimal("0") for job in self.jobs
        )
        self.actual_cost = sum(
            job.actual_cost or Decimal("0") for job in self.jobs
        )

    def add_tag(self, tag: str) -> None:
        """Add a tag to the project."""
        if self.tags is None:
            self.tags = []
        if tag not in self.tags:
            self.tags.append(tag)

    def remove_tag(self, tag: str) -> None:
        """Remove a tag from the project."""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)
