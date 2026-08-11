"""FastAPI app entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import Base, engine
from .routers import auth, notifications, reports, tasks
from .seed import seed_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (simple approach — no migrations needed for a small app) and seed the manager.
    Base.metadata.create_all(bind=engine)
    seed_manager()
    yield


app = FastAPI(title="Task Management API", lifespan=lifespan)

# Wide-open CORS for local development (the frontend runs on a different port).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/health/db", tags=["health"])
def health_db():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"database": "ok"}


app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(reports.router)
app.include_router(notifications.router)
