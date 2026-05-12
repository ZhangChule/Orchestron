from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import compensation, health, workflow


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(compensation.router)
api_router.include_router(workflow.router)
