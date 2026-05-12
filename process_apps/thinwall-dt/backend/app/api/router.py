from fastapi import APIRouter

from app.api.routes import compensation, health, prediction


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(prediction.router)
api_router.include_router(compensation.router)
