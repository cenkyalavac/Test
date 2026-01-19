"""
Finance Item Model with Polymorphic Relationships

Linked to either Project (Receivable) or Job (Payable) via nullable FKs
with a type discriminator for polymorphic integrity.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy import (
    CHAR,
    CheckConstraint,
    Computed,
    Date,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from .base import Base, TimestampMixin, UUIDMixin
from .enums import FinanceItemStatus, FinanceItemType

if TYPE_CHECKING:
    from .job import Job
    from .project import Project


class FinanceItem(Base, UUIDMixin, TimestampMixin):
    """
    Finance Item representing either a Receivable or Payable.

    Uses polymorphic pattern with type discriminator and nullable FKs:
    - RECEIVABLE: Linked to Project (client owes us)
    - PAYABLE: Linked to Job (we owe vendor)

    The total_amount and tax_amount are computed columns.

    Attributes:
        item_type: Discriminator (receivable or payable)
        project_id: FK to Project (for receivables)
        job_id: FK to Job (for payables)
        quantity: Number of units (e.g., weighted words)
        unit_price: Price per unit
        total_amount: Computed (quantity * unit_price)
    """

    __tablename__ = "finance_item"

    # Polymorphic type discriminator
    item_type: Mapped[FinanceItemType] = mapped_column(
        Enum(FinanceItemType, name="finance_item_type"),
        nullable=False,
    )

    # Link to Project (for Receivables - client owes us)
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Link to Job (for Payables - we owe vendor)
    job_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("job.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Financial details
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("1"),
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 4),
        nullable=False,
    )
    currency_code: Mapped[str] = mapped_column(
        CHAR(3),
        nullable=False,
        default="USD",
    )

    # Computed totals
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        Computed("quantity * unit_price", persisted=True),
    )

    # Tax handling
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        default=Decimal("0"),
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        Computed("quantity * unit_price * tax_rate", persisted=True),
    )

    # Status
    status: Mapped[FinanceItemStatus] = mapped_column(
        Enum(FinanceItemStatus, name="finance_item_status"),
        nullable=False,
        default=FinanceItemStatus.DRAFT,
        index=True,
    )

    # Invoice reference
    invoice_number: Mapped[Optional[str]] = mapped_column(
        String(100),
        index=True,
    )
    invoice_date: Mapped[Optional[date]] = mapped_column(Date)
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    paid_date: Mapped[Optional[date]] = mapped_column(Date)

    # For payables: external reference
    vendor_invoice_number: Mapped[Optional[str]] = mapped_column(String(255))

    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text)
    metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default="{}",
    )

    # Relationships
    project: Mapped[Optional["Project"]] = relationship(
        "Project",
        back_populates="finance_items",
        foreign_keys=[project_id],
    )

    job: Mapped[Optional["Job"]] = relationship(
        "Job",
        back_populates="finance_items",
        foreign_keys=[job_id],
    )

    __table_args__ = (
        # Enforce polymorphic integrity
        CheckConstraint(
            "(item_type = 'receivable' AND project_id IS NOT NULL AND job_id IS NULL) "
            "OR (item_type = 'payable' AND job_id IS NOT NULL)",
            name="chk_finance_item_link",
        ),
        CheckConstraint(
            "quantity > 0 AND unit_price >= 0",
            name="chk_finance_positive_values",
        ),
        Index("idx_finance_item_type", "item_type"),
        Index("idx_finance_item_invoice", "invoice_number"),
    )

    def __repr__(self) -> str:
        return (
            f"<FinanceItem(id={self.id}, type={self.item_type.value}, "
            f"amount={self.total_amount} {self.currency_code})>"
        )

    @validates("item_type", "project_id", "job_id")
    def validate_polymorphic_link(
        self,
        key: str,
        value: Any,
    ) -> Any:
        """Validate polymorphic relationship integrity."""
        # Allow setting values during construction
        # Full validation happens via DB constraint
        return value

    @property
    def is_receivable(self) -> bool:
        """Check if this is a receivable item."""
        return self.item_type == FinanceItemType.RECEIVABLE

    @property
    def is_payable(self) -> bool:
        """Check if this is a payable item."""
        return self.item_type == FinanceItemType.PAYABLE

    @property
    def is_invoiced(self) -> bool:
        """Check if this item has been invoiced."""
        return self.invoice_number is not None

    @property
    def is_paid(self) -> bool:
        """Check if this item has been paid."""
        return self.status == FinanceItemStatus.PAID

    @property
    def is_overdue(self) -> bool:
        """Check if this item is overdue for payment."""
        if self.due_date is None or self.is_paid:
            return False
        return date.today() > self.due_date

    @property
    def grand_total(self) -> Decimal:
        """Calculate grand total including tax."""
        return (self.total_amount or Decimal("0")) + (self.tax_amount or Decimal("0"))

    def mark_invoiced(
        self,
        invoice_number: str,
        invoice_date: Optional[date] = None,
        due_date: Optional[date] = None,
    ) -> None:
        """Mark this item as invoiced."""
        self.invoice_number = invoice_number
        self.invoice_date = invoice_date or date.today()
        self.due_date = due_date
        self.status = FinanceItemStatus.INVOICED

    def mark_paid(self, paid_date: Optional[date] = None) -> None:
        """Mark this item as paid."""
        self.paid_date = paid_date or date.today()
        self.status = FinanceItemStatus.PAID

    @classmethod
    def create_receivable(
        cls,
        project: "Project",
        description: str,
        quantity: Decimal,
        unit_price: Decimal,
        currency_code: str = "USD",
        tax_rate: Decimal = Decimal("0"),
    ) -> "FinanceItem":
        """
        Factory method to create a receivable finance item.

        Args:
            project: The project this receivable is for
            description: Line item description
            quantity: Quantity (e.g., weighted words)
            unit_price: Price per unit
            currency_code: Currency (default USD)
            tax_rate: Tax rate as decimal (e.g., 0.20 for 20%)

        Returns:
            New FinanceItem configured as receivable
        """
        return cls(
            item_type=FinanceItemType.RECEIVABLE,
            project_id=project.id,
            project=project,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            currency_code=currency_code,
            tax_rate=tax_rate,
        )

    @classmethod
    def create_payable(
        cls,
        job: "Job",
        description: str,
        quantity: Decimal,
        unit_price: Decimal,
        currency_code: str = "USD",
        tax_rate: Decimal = Decimal("0"),
        project: Optional["Project"] = None,
    ) -> "FinanceItem":
        """
        Factory method to create a payable finance item.

        Args:
            job: The job this payable is for
            description: Line item description
            quantity: Quantity (e.g., weighted words)
            unit_price: Price per unit
            currency_code: Currency (default USD)
            tax_rate: Tax rate as decimal
            project: Optional project reference for aggregation

        Returns:
            New FinanceItem configured as payable
        """
        return cls(
            item_type=FinanceItemType.PAYABLE,
            job_id=job.id,
            job=job,
            project_id=project.id if project else None,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            currency_code=currency_code,
            tax_rate=tax_rate,
        )
