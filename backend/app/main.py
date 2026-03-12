from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db import Base, engine
from app.routers import auth, profile, events, recommendations, influencer, transactions

# Create database tables on startup in this development setup.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dundaa API", version="0.1.0")

# Allow local frontend dev servers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local upload storage root.
# Uploaded files are saved under:
# - uploads/posters/
# - uploads/profiles/
uploads_root = Path("uploads")
uploads_root.mkdir(parents=True, exist_ok=True)

# Expose uploaded files publicly so the frontend can render them.
# Example:
#   /uploads/posters/abc123.jpg
#   /uploads/profiles/user123.png
app.mount("/uploads", StaticFiles(directory=str(uploads_root)), name="uploads")

# Register app routers.
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(events.router)
app.include_router(recommendations.router)
app.include_router(influencer.router)
app.include_router(transactions.router)


@app.get("/")
def root():
    """
    Simple health check endpoint.
    """
    return {"message": "Dundaa API running"}