import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.services.notifications import create_notification

from backend.app.dependencies import get_db, get_optional_current_user
from backend.app.models.event import Event
from backend.app.models.guest_order import GuestOrder
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.schemas.guest_checkout import (
    GuestCheckoutCreateRequest,
    GuestCheckoutCreateResponse,
    GuestCheckoutQuoteRequest,
    GuestCheckoutQuoteResponse,
    GuestOrderResponse,
)
from backend.app.utils.payments import generate_reference

router = APIRouter(prefix="/guest", tags=["Guest Checkout"])


SUPPORTED_PAYMENT_METHODS = {"mpesa", "card", "bank"}


def validate_checkoutable_event(event: Event) -> None:
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.is_live or event.approval_status != "approved":
        raise HTTPException(status_code=403, detail="This event is not available for checkout")

    if not event.has_ticket_sales:
        raise HTTPException(status_code=400, detail="This event does not sell tickets")

    if event.price is None or event.price <= 0:
        raise HTTPException(status_code=400, detail="This event does not have a valid ticket price")


def build_payment_next_action(payment_method: str, reference: str, total_amount: float, buyer_phone: str) -> dict:
    """
    Returns a frontend-friendly next action payload.

    Real gateway integrations can replace this later without changing the
    checkout contract.
    """
    if payment_method == "mpesa":
        return {
            "type": "mpesa_prompt",
            "message": "An M-Pesa payment prompt should be sent to the buyer phone number.",
            "phone": buyer_phone,
            "reference": reference,
            "amount": total_amount,
        }

    if payment_method == "card":
        return {
            "type": "card_checkout",
            "message": "Redirect the buyer to card entry flow.",
            "reference": reference,
            "amount": total_amount,
        }

    bank_account_name = os.getenv("DUNDAA_BANK_ACCOUNT_NAME", "Dundaa Limited")
    bank_account_number = os.getenv("DUNDAA_BANK_ACCOUNT_NUMBER", "0000000000")
    bank_name = os.getenv("DUNDAA_BANK_NAME", "Your Bank Name")
    bank_branch = os.getenv("DUNDAA_BANK_BRANCH", "Main Branch")

    return {
        "type": "bank_transfer",
        "message": "Display Dundaa bank details to the buyer.",
        "reference": reference,
        "amount": total_amount,
        "bank_details": {
            "account_name": bank_account_name,
            "account_number": bank_account_number,
            "bank_name": bank_name,
            "branch": bank_branch,
        },
    }


@router.post("/checkout/quote", response_model=GuestCheckoutQuoteResponse)
def create_guest_checkout_quote(
    payload: GuestCheckoutQuoteRequest,
    db: Session = Depends(get_db),
):
    """
    Lightweight quote endpoint used for real-time cart updates.
    """
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    validate_checkoutable_event(event)

    unit_price = float(event.price)
    total_amount = unit_price * payload.quantity

    return GuestCheckoutQuoteResponse(
        event_id=event.id,
        event_title=event.title,
        quantity=payload.quantity,
        unit_price=unit_price,
        total_amount=total_amount,
        payment_methods=["mpesa", "card", "bank"],
    )


@router.post("/checkout", response_model=GuestCheckoutCreateResponse)
async def create_guest_checkout_order(
    payload: GuestCheckoutCreateRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """
    Create a guest/public ticket checkout order.

    Supports:
    - guest checkout
    - authenticated public checkout
    - quantity-based pricing
    - payment method selection
    """
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    validate_checkoutable_event(event)

    payment_method = payload.payment_method.strip().lower()
    if payment_method not in SUPPORTED_PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Unsupported payment method")

    unit_price = float(event.price)
    total_amount = unit_price * payload.quantity
    reference = generate_reference("GUEST")

    order = GuestOrder(
        event_id=event.id,
        buyer_user_id=current_user.id if current_user else None,
        buyer_name=payload.buyer_name.strip(),
        buyer_email=payload.buyer_email.strip().lower(),
        buyer_phone=payload.buyer_phone.strip(),
        quantity=payload.quantity,
        unit_price=unit_price,
        total_amount=total_amount,
        payment_method=payment_method,
        status="pending_payment",
        reference=reference,
        referral_slug=payload.referral_slug,
    )

    db.add(order)

    # Create a matching transaction row for finance traceability.
    tx = Transaction(
        user_id=event.owner_id,
        tx_type="ticket_sale_pending",
        provider=payment_method,
        gross_amount=total_amount,
        tax_fee_amount=0.0,
        platform_fee_amount=0.0,
        influencer_amount=0.0,
        status="pending",
        reference=reference,
    )
    db.add(tx)

    db.commit()
    db.refresh(order)
    await create_notification(
        db,
        user_id=event.owner_id,
        type="ticket_sale",
        title="New ticket order",
        message=f"{payload.buyer_name.strip()} started a ticket purchase for {event.title}.",
        link="/dashboard",
        entity_type="event",
        entity_id=event.id,
    )

    return GuestCheckoutCreateResponse(
        order_id=order.id,
        reference=order.reference,
        status=order.status,
        payment_method=order.payment_method,
        total_amount=order.total_amount,
        next_action=build_payment_next_action(
            payment_method=order.payment_method,
            reference=order.reference,
            total_amount=order.total_amount,
            buyer_phone=order.buyer_phone,
        ),
    )


@router.get("/orders/{reference}", response_model=GuestOrderResponse)
def get_guest_order_status(
    reference: str,
    db: Session = Depends(get_db),
):
    """
    Lets frontend poll/revisit an order after checkout.
    """
    order = db.query(GuestOrder).filter(GuestOrder.reference == reference).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return order