from uuid import uuid4


def calculate_gift_split(amount: float) -> dict:
    """Apply the Dundaa financial rules to a gift amount.

    Rule used here:
    - 20% tax/platform fee first
    - 10% platform commission on the remaining amount
    - balance goes to influencer
    """
    tax_fee = round(amount * 0.20, 2)
    net_after_tax = amount - tax_fee
    platform_fee = round(net_after_tax * 0.10, 2)
    influencer_amount = round(net_after_tax - platform_fee, 2)
    return {
        "gross_amount": amount,
        "tax_fee_amount": tax_fee,
        "platform_fee_amount": platform_fee,
        "influencer_amount": influencer_amount,
    }


def generate_reference(prefix: str = "TX") -> str:
    """Generate a short human-readable transaction reference."""
    return f"{prefix}-{uuid4().hex[:12].upper()}"
