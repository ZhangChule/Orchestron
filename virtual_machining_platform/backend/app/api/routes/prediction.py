from fastapi import APIRouter

from app.schemas.prediction import WallErrorPredictionRequest, WallErrorPredictionResponse
from app.services.prediction_service import predict_wall_error


router = APIRouter(prefix="/prediction", tags=["prediction"])


@router.post("/wall-error", response_model=WallErrorPredictionResponse)
def wall_error(request: WallErrorPredictionRequest) -> WallErrorPredictionResponse:
    return predict_wall_error(request)
