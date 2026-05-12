from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.schemas.compensation import CompensationSuggestionResponse


class WorkflowRunRequest(BaseModel):
    node_id: str | None = None
    trace_id: str | None = None
    payload: dict[str, Any]


class WorkflowRunResponse(BaseModel):
    node_id: str
    trace_id: str | None = None
    status: str
    result: CompensationSuggestionResponse
