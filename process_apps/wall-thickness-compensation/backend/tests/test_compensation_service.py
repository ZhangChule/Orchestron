import math
import unittest

from app.schemas.compensation import CompensationSuggestionRequest
from app.services.compensation_service import suggest_compensation


class CompensationServiceTests(unittest.TestCase):
    def test_stiffness_based_uses_reference_and_milling_average_stiffness(self):
        request = CompensationSuggestionRequest(
            method="stiffness_based",
            model_version="v1.0",
            radial_depth=1.0,
            reference_average_stiffness=1000.0,
            milling_average_stiffness=800.0,
            points=[
                {"id": "P1", "x": 0, "y": 0, "z": 0, "stiffness": 800, "error": 0.08},
                {"id": "P2", "x": 1, "y": 0, "z": 0, "stiffness": 800, "error": 0.12},
            ],
        )

        response = suggest_compensation(request)

        average_error = 0.1
        multiplier = request.radial_depth / (request.radial_depth - average_error)
        denominator = 1 - request.reference_average_stiffness / request.milling_average_stiffness + multiplier
        expected = (multiplier / denominator) * average_error
        self.assertTrue(math.isclose(response.suggestion_value, expected, rel_tol=1e-12))
        self.assertEqual(response.average_error, average_error)
        self.assertEqual(response.point_count, 2)

    def test_stiffness_based_requires_both_average_stiffness_values(self):
        request = CompensationSuggestionRequest(
            method="stiffness_based",
            model_version="v1.0",
            radial_depth=1.0,
            reference_average_stiffness=1000.0,
            points=[
                {"id": "P1", "x": 0, "y": 0, "z": 0, "stiffness": 800, "error": 0.1},
            ],
        )

        with self.assertRaisesRegex(ValueError, "reference and milling average stiffness are required"):
            suggest_compensation(request)


if __name__ == "__main__":
    unittest.main()
