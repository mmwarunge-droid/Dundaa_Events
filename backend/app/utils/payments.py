from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


def generate_reference(prefix: str) -> str:
    """
    Generate a short transaction or payout reference.

    Example:
    CASH-20260316-AB12CD34
    """
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_part = uuid4().hex[:8].upper()
    clean_prefix = (prefix or "TX").strip().upper()

    return f"{clean_prefix}-{date_part}-{random_part}"


def calculate_platform_fee(amount: float) -> float:
    """
    Platform fee helper.

    Current baseline:
    - 5% platform fee
    """
    amount = max(float(amount), 0.0)
    return round(amount * 0.05, 2)


def calculate_tax_fee(amount: float) -> float:
    """
    Tax placeholder helper.

    Current baseline:
    - 0% until tax rules are finalized
    """
    amount = max(float(amount), 0.0)
    return round(amount * 0.0, 2)


def calculate_influencer_net_amount(amount: float) -> float:
    """
    Net amount after fees.
    """
    gross = max(float(amount), 0.0)
    platform_fee = calculate_platform_fee(gross)
    tax_fee = calculate_tax_fee(gross)

    return round(gross - platform_fee - tax_fee, 2)