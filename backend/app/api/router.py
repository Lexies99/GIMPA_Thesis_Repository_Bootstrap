from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import auth, health, papers, users, departments, theses

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, tags=["users"])
api_router.include_router(theses.router, tags=["theses"])
api_router.include_router(papers.router, tags=["papers"])
api_router.include_router(departments.router, tags=["departments"])

