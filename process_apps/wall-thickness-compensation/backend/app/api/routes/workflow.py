from __future__ import annotations

from fastapi import APIRouter

from app.schemas.compensation import CompensationSuggestionRequest
from app.schemas.workflow import WorkflowRunRequest, WorkflowRunResponse
from app.services.compensation_service import suggest_compensation


PROCESS_ID = "wall-thickness-compensation"
router = APIRouter(prefix="/workflow", tags=["workflow"])


@router.get("/manifest")
def manifest() -> dict:
    return {
        "id": PROCESS_ID,
        "name": "Wall thickness compensation",
        "version": "0.1.0",
        "description": "Generate machining compensation plans from wall error points.",
        "inputs": [
            {"name": "method", "type": "string", "default": "stiffness_based"},
            {"name": "radial_depth", "type": "number", "unit": "mm"},
            {"name": "points", "type": "array", "item": "error_point"},
        ],
        "outputs": [
            {"name": "suggestion_value", "type": "number", "unit": "mm"},
            {"name": "compensation_plan", "type": "machining_compensation_plan"},
        ],
    }


@router.post("/run", response_model=WorkflowRunResponse)
def run_workflow(request: WorkflowRunRequest) -> WorkflowRunResponse:
    payload = CompensationSuggestionRequest.model_validate(request.payload)
    result = suggest_compensation(payload)
    return WorkflowRunResponse(
        node_id=request.node_id or PROCESS_ID,
        trace_id=request.trace_id,
        status="succeeded",
        result=result,
    )
