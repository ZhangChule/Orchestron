from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class WorkpieceInput(BaseModel):
    length: float = Field(gt=0)
    height: float = Field(gt=0)
    thickness: float = Field(gt=0)
    base_width: float = Field(gt=0)
    base_height: float = Field(gt=0)

    @field_validator("base_height")
    @classmethod
    def base_height_must_be_below_total_height(cls, value: float, info):
        height = info.data.get("height")
        if height is not None and value >= height:
            raise ValueError("base_height must be smaller than height")
        return value


class MaterialInput(BaseModel):
    name: str
    elasticModulus: str
    poissonRatio: str
    density: str


class ToolInput(BaseModel):
    type: str
    diameter: float = Field(gt=0)
    teeth: int = Field(gt=0)
    helix_angle: float
    immersion_angle: float
    cutter_length: float = Field(gt=0)
    overall_length: float = Field(gt=0)


class ProcessInput(BaseModel):
    spindle_speed: float = Field(gt=0)
    feed_rate: float = Field(gt=0)
    axial_depth: float = Field(gt=0)
    radial_depth: float = Field(gt=0)
    cutting_mode: Literal["up_milling", "down_milling"]


class KeyPointInput(BaseModel):
    # Frontend uploads stiffness-only points; coordinates are filled by backend.
    id: str
    stiffness: float = Field(gt=0)
    execution_radial_depth: float | None = Field(default=None, gt=0)


class KeyPointResult(BaseModel):
    id: str
    x: float
    y: float
    z: float
    stiffness: float
    error: float


class PredictionSummary(BaseModel):
    point_count: int
    min_error: float
    max_error: float
    average_error: float
