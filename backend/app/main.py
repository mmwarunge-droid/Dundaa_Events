from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routers import events, users, auth, transactions, featured_promotions

app = FastAPI()

# Create tables (only for dev — production should rely on Alembic)
Base.metadata.create_all(bind=engine)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://dundaaevents.com",
        "https://www.dundaaevents.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(events.router)
app.include_router(transactions.router)
app.include_router(featured_promotions.router)


@app.get("/")
def root():
    return {"message": "Dundaa API running"}