from __future__ import annotations

import numpy as np

from app.algorithms.calibration.fourier import LinearFourierForceModel
from app.algorithms.solver.steady_state import (
    SteadyStateResult,
    sdof_from_stiffness,
    solve_steady_state_one_period,
)


def local_surface_trace(
    times: np.ndarray,
    u_deflection: np.ndarray,
    tool_radius: float,
    spindle_rpm: float,
    feed_speed_mm_per_s: float,
) -> tuple[np.ndarray, np.ndarray]:
    """生成局部表面轨迹。

    当前预测接口只使用 SLE 数值，不直接返回轨迹；保留该函数是为了后续调试、
    画图或把局部轨迹发给前端时复用。
    """

    omega = 2.0 * np.pi * spindle_rpm / 60.0
    x_trace = tool_radius * np.sin(omega * times) + feed_speed_mm_per_s * times
    y_trace = tool_radius * np.cos(omega * times) + u_deflection
    return x_trace, y_trace


def local_sle_from_periodic_orbit(
    times: np.ndarray,
    u_deflection: np.ndarray,
    tool_radius: float,
    spindle_rpm: float,
) -> float:
    """由一周期弹性位移轨道计算局部表面位置误差 SLE。"""

    omega = 2.0 * np.pi * spindle_rpm / 60.0
    return float(np.max(u_deflection + tool_radius * np.cos(omega * times)) - tool_radius)


def solve_wall_error_with_response(
    force_model: LinearFourierForceModel,
    stiffness: float,
    nominal_radial_depth: float,
    damping_ratio: float,
    natural_frequency_hz: float,
    tool_radius: float,
    n_substeps: int = 200,
) -> tuple[float, SteadyStateResult]:
    """求单个刚度测点的壁厚误差，并保留完整稳态响应用于调试。

    对外接口通常只需要误差值；调试算法时可以调用这个函数查看 q(t)、u(t)、
    固定点和力信号等中间结果。
    """

    sdof = sdof_from_stiffness(
        stiffness=stiffness,
        natural_frequency_hz=natural_frequency_hz,
        damping_ratio=damping_ratio,
        nominal_rdoc=nominal_radial_depth,
        spindle_rpm=force_model.spindle_speed,
    )
    # 先用该测点刚度对应的 SDOF 参数求一周期稳态响应。
    response = solve_steady_state_one_period(
        fsc=force_model,
        sdof=sdof,
        n_substeps=n_substeps,
        t0=0.0,
        return_force=True,
    )
    # 再把稳态位移轨道转换成局部表面位置误差。
    sle = local_sle_from_periodic_orbit(
        times=response.times,
        u_deflection=response.u_deflection,
        tool_radius=tool_radius,
        spindle_rpm=force_model.spindle_speed,
    )
    return sle, response


def solve_wall_error(
    force_model: LinearFourierForceModel,
    stiffness: float,
    nominal_radial_depth: float,
    damping_ratio: float,
    natural_frequency_hz: float,
    tool_radius: float,
) -> float:
    """预测单个刚度测点的壁厚误差。

    这是 prediction_service 逐点调用的简化入口，只返回最终 SLE 数值。
    """

    sle, _ = solve_wall_error_with_response(
        force_model=force_model,
        stiffness=stiffness,
        nominal_radial_depth=nominal_radial_depth,
        damping_ratio=damping_ratio,
        natural_frequency_hz=natural_frequency_hz,
        tool_radius=tool_radius,
    )
    return sle
