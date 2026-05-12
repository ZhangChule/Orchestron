from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.machining import (
    KeyPointInput,
    KeyPointResult,
    MaterialInput,
    PredictionSummary,
    ProcessInput,
    ToolInput,
    WorkpieceInput,
)


class WallErrorPredictionRequest(BaseModel):
    workpiece: WorkpieceInput
    material: MaterialInput
    tool: ToolInput
    process: ProcessInput
    key_points: list[KeyPointInput] = Field(min_length=1)
    model_version: str = "v1.0"


class WallErrorPredictionResponse(BaseModel):
    points: list[KeyPointResult]
    summary: PredictionSummary
    message: str
    model_version: str = "v1.0"
