import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router


logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(name)s: %(message)s")


def cors_origins() -> list[str]:
    configured = os.getenv("THINWALL_DT_CORS_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:18080",
        "http://127.0.0.1:18080",
    ]


app = FastAPI(title="Thin-wall Digital Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
