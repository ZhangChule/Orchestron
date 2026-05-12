from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router


def cors_origins() -> list[str]:
    configured = os.getenv("WTC_CORS_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:18090",
        "http://127.0.0.1:18090",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]


def cors_origin_regex() -> str | None:
    return os.getenv("WTC_CORS_ORIGIN_REGEX", r"https?://.*:8080")


app = FastAPI(title="Wall Thickness Compensation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_origin_regex=cors_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
