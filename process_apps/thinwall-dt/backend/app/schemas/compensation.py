from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.machining import KeyPointResult


CompensationMethod = Literal["mirror", "first_order", "stiffness_based"]


class CompensationSuggestionRequest(BaseModel):
    method: CompensationMethod
    radial_depth: float = Field(gt=0)
    model_version: str = "v1.0"
    points: list[KeyPointResult] = Field(min_length=1)


class CompensationSuggestionResponse(BaseModel):
    method: CompensationMethod
    suggestion_value: float
    average_error: float
    point_count: int
    message: str
