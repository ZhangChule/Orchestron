from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.algorithms.cutting_force.mechanistic import (
    MechanisticDefaults,
    predict_force_one_revolution,
)
from app.schemas.machining import ProcessInput, ToolInput


@dataclass(frozen=True)
class LinearFourierForceModel:
    # Same vector layout as the reference FSCLinearModel:
    # [a0, a1, b1, a2, b2, ..., an, bn].
    p_const: np.ndarray
    p_linear: np.ndarray
    n_harmonics: int
    spindle_speed: float
    r2: np.ndarray
    coeff_matrix: np.ndarray
    radial_depth_samples: np.ndarray


def fourier_basis(t: float, omega: float, n_harmonics: int) -> np.ndarray:
    basis = [1.0]
    for n in range(1, n_harmonics + 1):
        basis.append(np.cos(n * omega * t))
        basis.append(np.sin(n * omega * t))
    return np.array(basis, dtype=float)


def trig_fourier_coefficients(signal: np.ndarray, n_harmonics: int) -> np.ndarray:
    sample_count = len(signal)
    theta = 2.0 * np.pi * np.arange(sample_count) / sample_count
    coeffs = np.zeros(2 * n_harmonics + 1, dtype=float)
    coeffs[0] = np.mean(signal)

    for n in range(1, n_harmonics + 1):
        coeffs[2 * n - 1] = 2.0 / sample_count * np.sum(signal * np.cos(n * theta))
        coeffs[2 * n] = 2.0 / sample_count * np.sum(signal * np.sin(n * theta))

    return coeffs


def reconstruct_from_trig_coeffs(
    coeffs: np.ndarray,
    time: np.ndarray,
    spindle_speed: float,
) -> np.ndarray:
    omega = 2.0 * np.pi * spindle_speed / 60.0
    n_harmonics = (len(coeffs) - 1) // 2
    signal = np.full_like(time, coeffs[0], dtype=float)
    for n in range(1, n_harmonics + 1):
        signal += coeffs[2 * n - 1] * np.cos(n * omega * time)
        signal += coeffs[2 * n] * np.sin(n * omega * time)
    return signal


def linear_regression_r2(x: np.ndarray, y: np.ndarray, y_hat: np.ndarray) -> float:
    _ = x
    ss_res = np.sum((y - y_hat) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    if ss_tot < 1e-15:
        return 1.0
    return float(1.0 - ss_res / ss_tot)


def calibrate_linear_fourier_model(
    tool: ToolInput,
    process: ProcessInput,
    radial_depth_samples: np.ndarray,
    n_harmonics: int | None = None,
    defaults: MechanisticDefaults | None = None,
) -> LinearFourierForceModel:
    defaults = defaults or MechanisticDefaults()
    n_harmonics = defaults.n_harmonics if n_harmonics is None else n_harmonics
    radial_depth_samples = np.asarray(radial_depth_samples, dtype=float)
    n_cols = 2 * n_harmonics + 1

    coeff_matrix = np.zeros((len(radial_depth_samples), n_cols), dtype=float)
    for row, radial_depth in enumerate(radial_depth_samples):
        time, force_y = predict_force_one_revolution(
            tool=tool,
            process=process,
            radial_depth=float(radial_depth),
            defaults=defaults,
        )
        coeffs = trig_fourier_coefficients(force_y, n_harmonics)
        coeff_matrix[row, :] = coeffs

    p_const = np.zeros(n_cols, dtype=float)
    p_linear = np.zeros(n_cols, dtype=float)
    r2 = np.zeros(n_cols, dtype=float)

    for col in range(n_cols):
        y = coeff_matrix[:, col]
        slope, intercept = np.polyfit(radial_depth_samples, y, deg=1)
        y_hat = intercept + slope * radial_depth_samples
        p_const[col] = intercept
        p_linear[col] = slope
        r2[col] = linear_regression_r2(radial_depth_samples, y, y_hat)

    model = LinearFourierForceModel(
        p_const=p_const,
        p_linear=p_linear,
        n_harmonics=n_harmonics,
        spindle_speed=process.spindle_speed,
        r2=r2,
        coeff_matrix=coeff_matrix,
        radial_depth_samples=radial_depth_samples,
    )

    return model


def force_from_model(model: LinearFourierForceModel, radial_depth: float, t: float) -> float:
    omega = 2.0 * np.pi * model.spindle_speed / 60.0
    basis = fourier_basis(t, omega, model.n_harmonics)
    return float(np.dot(model.p_const + model.p_linear * radial_depth, basis))
