from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db import Base, engine
from app.routers import admin, events, influencer, kyc, profile, recommendations, transactions, auth, event_search

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dundaa API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only
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
app.include_router(recommendations.router)
app.include_router(influencer.router)
app.include_router(transactions.router)

app.include_router(kyc.router)
app.include_router(admin.router)
app.include_router(event_search.router)


@app.get("/")
def root():
    return {"message": "Dundaa API running"}