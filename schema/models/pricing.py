"""
Pricing Engine Models

PriceProfile: CAT tool match discount grids
RateCard: Base rates per language pair
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CHAR,
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin
from .enums import ServiceType

if TYPE_CHECKING:
    from .account import Account


# Default CAT grid configuration
DEFAULT_CAT_GRID = {
    "100": 0.10,
    "context_match": 0.02,
    "repetitions": 0.10,
    "99-95": 0.25,
    "94-85": 0.50,
    "84-75": 0.75,
    "74-50": 1.0,
    "no_match": 1.0,
}


class PriceProfile(Base, UUIDMixin, TimestampMixin):
    """
    Price Profile defining CAT tool match discount percentages.

    The cat_grid JSON object defines payment percentages by match type.
    For example: {"100": 0.10, "fuzzy": 0.60} means:
    - 100% matches pay at 10% of the base rate
    - Fuzzy matches pay at 60% of the base rate

    Attributes:
        name: Display name for the profile
        cat_grid: JSON object with match type -> percentage mappings
        minimum_charge: Optional minimum charge amount
        is_default: Whether this is the system default profile
    """

    __tablename__ = "price_profile"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # CAT Grid: JSON defining payment percentages by match type
    cat_grid: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: DEFAULT_CAT_GRID.copy(),
        server_default=str(DEFAULT_CAT_GRID).replace("'", '"'),
    )

    # Minimum charge settings
    minimum_charge: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0")
    )
    minimum_charge_currency: Mapped[str] = mapped_column(CHAR(3), default="USD")

    # Metadata
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    accounts: Mapped[list["Account"]] = relationship(
        "Account",
        back_populates="price_profile",
    )

    __table_args__ = (
        CheckConstraint(
            "jsonb_typeof(cat_grid) = 'object'",
            name="chk_cat_grid_valid",
        ),
        Index("idx_price_profile_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<PriceProfile(id={self.id}, name='{self.name}')>"

    def calculate_weighted_words(self, word_breakdown: dict[str, int]) -> Decimal:
        """
        Calculate weighted word count using this profile's CAT grid.

        Args:
            word_breakdown: Dict mapping match types to word counts
                           e.g., {"100": 500, "94-85": 300, "no_match": 200}

        Returns:
            Weighted word count as Decimal
        """
        weighted_total = Decimal("0")

        for match_type, word_count in word_breakdown.items():
            # Get percentage from grid, default to 1.0 (full rate)
            percentage = Decimal(str(self.cat_grid.get(
                match_type,
                self.cat_grid.get("no_match", 1.0)
            )))
            weighted_total += Decimal(str(word_count)) * percentage

        return weighted_total

    def get_percentage(self, match_type: str) -> Decimal:
        """Get the payment percentage for a specific match type."""
        return Decimal(str(self.cat_grid.get(
            match_type,
            self.cat_grid.get("no_match", 1.0)
        )))


class RateCard(Base, UUIDMixin, TimestampMixin):
    """
    Rate Card storing base rates per language pair.

    Can be account-specific (for client-specific rates) or global
    (account_id is NULL) for default rates.

    Attributes:
        account_id: Optional FK to account (NULL for default rates)
        source_language: ISO 639-1 language code (e.g., 'en', 'en-US')
        target_language: ISO 639-1 language code (e.g., 'de', 'de-DE')
        service_type: Type of service this rate applies to
        rate_per_word: Rate per weighted word
        effective_from: Start date for this rate
        effective_to: End date (NULL means currently active)
    """

    __tablename__ = "rate_card"

    # Link to account (NULL for default rates)
    account_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("account.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Language pair
    source_language: Mapped[str] = mapped_column(CHAR(5), nullable=False)
    target_language: Mapped[str] = mapped_column(CHAR(5), nullable=False)

    # Service type
    service_type: Mapped[ServiceType] = mapped_column(
        Enum(ServiceType, name="service_type", create_type=False),
        nullable=False,
        default=ServiceType.TEP,
    )

    # Rate information
    rate_per_word: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    rate_per_hour: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    currency_code: Mapped[str] = mapped_column(CHAR(3), nullable=False, default="USD")

    # Effective dates for rate versioning
    effective_from: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    account: Mapped[Optional["Account"]] = relationship("Account")

    __table_args__ = (
        UniqueConstraint(
            "account_id",
            "source_language",
            "target_language",
            "service_type",
            "effective_to",
            name="uq_rate_card_active",
        ),
        Index("idx_rate_card_languages", "source_language", "target_language"),
        Index("idx_rate_card_effective", "effective_from", "effective_to"),
    )

    def __repr__(self) -> str:
        return (
            f"<RateCard(id={self.id}, "
            f"{self.source_language}->{self.target_language}, "
            f"rate={self.rate_per_word} {self.currency_code})>"
        )

    @property
    def is_active(self) -> bool:
        """Check if this rate is currently active."""
        today = date.today()
        return (
            self.effective_from <= today
            and (self.effective_to is None or self.effective_to >= today)
        )

    @property
    def is_default(self) -> bool:
        """Check if this is a default (non-account-specific) rate."""
        return self.account_id is None

    @property
    def language_pair(self) -> str:
        """Get formatted language pair string."""
        return f"{self.source_language.strip()}-{self.target_language.strip()}"

    def calculate_cost(self, weighted_words: Decimal) -> Decimal:
        """Calculate total cost for given weighted word count."""
        return weighted_words * self.rate_per_word
