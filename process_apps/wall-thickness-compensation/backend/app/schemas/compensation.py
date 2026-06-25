from __future__ import annotations

from typing import Any, Literal
from typing import Optional

from pydantic import BaseModel, Field


CompensationMethod = Literal["mirror", "first_order", "stiffness_based"]


class ErrorPoint(BaseModel):
    id: str
    x: float
    y: float
    z: float
    stiffness: float = Field(gt=0)
    error: float

class CompensationSuggestionRequest(BaseModel):
    method: CompensationMethod
    model_version: str = "v1.0"
    points: list[ErrorPoint] = Field(min_length=1)
    radial_depth: float = Field(gt=0)
    average_error: Optional[float] = Field(default=None)
    point_count: int = Field(default=0, ge=0)
    reference_average_stiffness: Optional[float] = Field(default=None, gt=0)
    milling_average_stiffness: Optional[float] = Field(default=None, gt=0)

class CompensationPlan(BaseModel):
    type: Literal["machining_compensation_plan"] = "machining_compensation_plan"
    contract_version: str = "1.0"
    source_process_id: str = "wall-thickness-compensation"
    method: CompensationMethod
    delta_radial_depth: float
    source_error_summary: dict[str, Any]


class CompensationSuggestionResponse(BaseModel):
    method: CompensationMethod
    suggestion_value: float
    average_error: float
    point_count: int
    message: str
    compensation_plan: CompensationPlan
