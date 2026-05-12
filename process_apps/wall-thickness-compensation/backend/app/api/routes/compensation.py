from __future__ import annotations

from fastapi import APIRouter

from app.schemas.compensation import CompensationSuggestionRequest, CompensationSuggestionResponse
from app.services.compensation_service import suggest_compensation


router = APIRouter(prefix="/compensation", tags=["compensation"])


@router.post("/suggest", response_model=CompensationSuggestionResponse)
def suggest(request: CompensationSuggestionRequest) -> CompensationSuggestionResponse:
    return suggest_compensation(request)
