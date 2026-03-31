from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.db import Base, SessionLocal, engine
from backend.app.models.user import User
from backend.app.routers import (
    admin,
    auth,
    campaigns,
    event_search,
    events,
    guest_checkout,
    influencer,
    kyc,
    notifications,
    profile,
    recommendations,
    transactions,
    voting,
)
from backend.app.security import decode_token_or_none
from backend.app.services.websocket_manager import notification_ws_manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dundaa API", version="0.7.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # local frontend
        "https://dundaa-events-frontend.onrender.com",  # deployed frontend
        "https://dundaaevents.com",
        "https://www.dundaaevents.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_root = Path("uploads")
uploads_root.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(uploads_root)), name="uploads")

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(events.router)
app.include_router(campaigns.router)
app.include_router(recommendations.router)
app.include_router(influencer.router)
app.include_router(transactions.router)
app.include_router(guest_checkout.router)
app.include_router(voting.router)
app.include_router(notifications.router)
app.include_router(kyc.router)
app.include_router(admin.router)
app.include_router(event_search.router)


@app.websocket("/ws/notifications")
async def notifications_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    payload = decode_token_or_none(token) if token else None

    if not payload or not payload.get("sub"):
        await websocket.close(code=1008)
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user:
            await websocket.close(code=1008)
            return

        await notification_ws_manager.connect(user.id, websocket)
        await websocket.send_json({
            "event": "notifications.connected",
            "user_id": user.id,
        })

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_ws_manager.disconnect(int(payload["sub"]), websocket)
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Dundaa API running"}