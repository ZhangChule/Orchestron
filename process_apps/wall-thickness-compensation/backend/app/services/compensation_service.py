from __future__ import annotations

from app.schemas.compensation import CompensationPlan, CompensationSuggestionRequest, CompensationSuggestionResponse


def suggest_compensation(request: CompensationSuggestionRequest) -> CompensationSuggestionResponse:
    errors = [point.error for point in request.points]
    average_error = sum(errors) / len(errors)

    if request.method == "mirror":
        suggestion = -average_error
    else:
        denominator = request.radial_depth - average_error
        if abs(denominator) < 1e-12:
            raise ValueError("radial_depth is too close to average_error")
        multiplier = request.radial_depth / denominator
        if request.method == "first_order":
            suggestion = -(multiplier * average_error)
        else:
            stiffness_values = [point.stiffness for point in request.points]
            average_stiffness = sum(stiffness_values) / len(stiffness_values)
            correction_denominator = 1 - average_stiffness / (average_stiffness * 0.85) + multiplier
            if abs(correction_denominator) < 1e-12:
                raise ValueError("stiffness compensation denominator is too small")
            suggestion = -(multiplier / correction_denominator) * average_error

    plan = CompensationPlan(
        method=request.method,
        delta_radial_depth=suggestion,
        source_error_summary={
            "average_error": average_error,
            "point_count": len(request.points),
        },
    )

    return CompensationSuggestionResponse(
        method=request.method,
        suggestion_value=suggestion,
        average_error=average_error,
        point_count=len(request.points),
        message="backend compensation suggestion",
        compensation_plan=plan,
    )
