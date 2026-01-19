"""
Account Model with Self-Referencing Hierarchy

Supports recursive parent-child relationships for client organizations.
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy import (
    CHAR,
    CheckConstraint,
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
from .enums import AccountStatus, AccountType, ServiceType

if TYPE_CHECKING:
    from .pricing import PriceProfile
    from .project import Project


class Account(Base, UUIDMixin, TimestampMixin):
    """
    Account entity representing clients, agencies, or vendors.

    Supports hierarchical organization structure via self-referencing parent_id.

    Attributes:
        parent_id: Optional FK to parent account for hierarchy
        name: Display name of the account
        code: Unique internal code (e.g., "GOOG-IE")
        type: Classification enum (direct_client, agency, enterprise, etc.)
        status: Lifecycle status (active, inactive, unverified, etc.)
    """

    __tablename__ = "account"

    # Hierarchy: self-referencing for parent-child relationships
    parent_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("account.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Core fields
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    type: Mapped[AccountType] = mapped_column(
        Enum(AccountType, name="account_type"),
        nullable=False,
        default=AccountType.PROSPECT,
    )
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, name="account_status"),
        nullable=False,
        default=AccountStatus.UNVERIFIED,
    )

    # Contact information
    primary_contact_name: Mapped[Optional[str]] = mapped_column(String(255))
    primary_contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    billing_email: Mapped[Optional[str]] = mapped_column(String(255))

    # Financial settings
    currency_code: Mapped[str] = mapped_column(CHAR(3), default="USD")
    payment_terms_days: Mapped[int] = mapped_column(Integer, default=30)
    credit_limit: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))

    # Default settings
    default_service_type: Mapped[ServiceType] = mapped_column(
        Enum(ServiceType, name="service_type"),
        default=ServiceType.TEP,
    )
    default_deadline_days: Mapped[int] = mapped_column(Integer, default=3)

    # Reference to pricing
    price_profile_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("price_profile.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Metadata
    external_ids: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    parent: Mapped[Optional["Account"]] = relationship(
        "Account",
        back_populates="children",
        remote_side="Account.id",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["Account"]] = relationship(
        "Account",
        back_populates="parent",
        foreign_keys=[parent_id],
    )

    price_profile: Mapped[Optional["PriceProfile"]] = relationship(
        "PriceProfile",
        back_populates="accounts",
    )

    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="account",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("parent_id != id", name="chk_account_no_self_parent"),
        Index("idx_account_status", "status"),
        Index("idx_account_type", "type"),
    )

    def __repr__(self) -> str:
        return f"<Account(id={self.id}, name='{self.name}', type={self.type.value})>"

    @property
    def is_root(self) -> bool:
        """Check if this account is a root (no parent)."""
        return self.parent_id is None

    @property
    def has_children(self) -> bool:
        """Check if this account has child accounts."""
        return len(self.children) > 0

    def get_all_descendants(self) -> list["Account"]:
        """
        Recursively collect all descendant accounts.

        Note: For large hierarchies, prefer using the database function
        get_account_descendants() for better performance.
        """
        descendants = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_all_descendants())
        return descendants

    def get_ancestor_chain(self) -> list["Account"]:
        """
        Get the chain of ancestors from this account to the root.

        Returns a list starting with the immediate parent and ending with the root.
        """
        ancestors = []
        current = self.parent
        while current is not None:
            ancestors.append(current)
            current = current.parent
        return ancestors

    def get_root_account(self) -> "Account":
        """Get the root account of this hierarchy."""
        if self.parent is None:
            return self
        return self.parent.get_root_account()
