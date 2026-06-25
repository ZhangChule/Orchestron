from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.schemas.prediction import WallErrorPredictionRequest
from app.services.prediction_service import predict_wall_error


def base_request(key_points: list[dict]) -> WallErrorPredictionRequest:
    return WallErrorPredictionRequest(
        workpiece={
            "length": 120,
            "height": 55,
            "thickness": 6,
            "base_width": 120,
            "base_height": 15,
        },
        material={
            "name": "aluminum",
            "elasticModulus": "70000",
            "poissonRatio": "0.33",
            "density": "2700",
        },
        tool={
            "type": "flat_end_mill",
            "diameter": 10,
            "teeth": 2,
            "helix_angle": 30,
            "immersion_angle": 90,
            "cutter_length": 25,
            "overall_length": 60,
        },
        process={
            "spindle_speed": 7200,
            "feed_rate": 48,
            "axial_depth": 10,
            "radial_depth": 1,
            "cutting_mode": "down_milling",
        },
        key_points=key_points,
    )


class PerPointRadialDepthTest(unittest.TestCase):
    def test_key_point_execution_radial_depth_is_optional_for_legacy_requests(self) -> None:
        request = base_request([
            {"id": "K1_J1_I1", "stiffness": 300},
        ])

        self.assertIsNone(request.key_points[0].execution_radial_depth)

    def test_rejects_non_positive_key_point_execution_radial_depth(self) -> None:
        with self.assertRaises(ValueError):
            base_request([
                {"id": "K1_J1_I1", "stiffness": 300, "execution_radial_depth": 0},
            ])

    @patch("app.services.prediction_service.calibrate_linear_fourier_model", return_value=object())
    @patch("app.services.prediction_service.solve_wall_error")
    def test_predict_wall_error_uses_each_key_point_execution_radial_depth(
        self,
        solve_wall_error,
        _calibrate_linear_fourier_model,
    ) -> None:
        solve_wall_error.side_effect = lambda **kwargs: kwargs["nominal_radial_depth"]
        request = base_request([
            {"id": "K1_J1_I1", "stiffness": 300, "execution_radial_depth": 0.25},
            {"id": "K2_J1_I1", "stiffness": 320, "execution_radial_depth": 0.4},
        ])

        response = predict_wall_error(request)

        self.assertEqual([point.error for point in response.points], [0.25, 0.4])
        self.assertEqual(
            [call.kwargs["nominal_radial_depth"] for call in solve_wall_error.call_args_list],
            [0.25, 0.4],
        )

    @patch("app.services.prediction_service.calibrate_linear_fourier_model", return_value=object())
    @patch("app.services.prediction_service.solve_wall_error")
    def test_predict_wall_error_falls_back_to_process_radial_depth_for_legacy_points(
        self,
        solve_wall_error,
        _calibrate_linear_fourier_model,
    ) -> None:
        solve_wall_error.side_effect = lambda **kwargs: kwargs["nominal_radial_depth"]
        request = base_request([
            {"id": "K1_J1_I1", "stiffness": 300},
            {"id": "K2_J1_I1", "stiffness": 320},
        ])

        response = predict_wall_error(request)

        self.assertEqual([point.error for point in response.points], [1, 1])
        self.assertEqual(
            [call.kwargs["nominal_radial_depth"] for call in solve_wall_error.call_args_list],
            [1, 1],
        )


if __name__ == "__main__":
    unittest.main()
