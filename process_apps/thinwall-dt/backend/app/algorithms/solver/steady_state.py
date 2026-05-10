from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.linalg import expm

from app.algorithms.calibration.fourier import LinearFourierForceModel, fourier_basis, force_from_model


@dataclass(frozen=True)
class SDOFParams:
    """单自由度动力学参数。

    mass_kg 保留 kg 单位，进入方程前再转换成 N*s^2/mm，和参考脚本保持一致。
    """

    mass_kg: float
    natural_frequency_hz: float
    damping_ratio: float
    nominal_rdoc: float
    spindle_rpm: float


@dataclass(frozen=True)
class SteadyStateResult:
    """一周期稳态固定点求解结果。"""

    times: np.ndarray
    q_actual: np.ndarray
    u_deflection: np.ndarray
    qdot: np.ndarray
    state: np.ndarray
    force: np.ndarray
    phi: np.ndarray
    g: np.ndarray
    x0_star: np.ndarray
    a0: np.ndarray


def kg_to_ns2_per_mm(mass_kg: float) -> float:
    """把 kg 转成 mm-N-s 单位制下的等效质量。"""

    return mass_kg * 1e-3


def mass_kg_from_stiffness(stiffness: float, natural_frequency_hz: float, damping_ratio: float) -> float:
    """根据测点刚度、阻尼比和频率反算模态质量。

    公式：m = k * 1000 * (1 - xi^2) / (2*pi*f)^2
    其中 stiffness 使用 N/mm，返回质量使用 kg。
    """

    omega_n = 2.0 * np.pi * natural_frequency_hz
    return stiffness * 1000.0 * (1.0 - damping_ratio**2) / omega_n**2


def sdof_from_stiffness(
    stiffness: float,
    natural_frequency_hz: float,
    damping_ratio: float,
    nominal_rdoc: float,
    spindle_rpm: float,
) -> SDOFParams:
    """把刚度测点转换成单自由度模型参数。"""

    return SDOFParams(
        mass_kg=mass_kg_from_stiffness(stiffness, natural_frequency_hz, damping_ratio),
        natural_frequency_hz=natural_frequency_hz,
        damping_ratio=damping_ratio,
        nominal_rdoc=nominal_rdoc,
        spindle_rpm=spindle_rpm,
    )


def sdof_derived_params(sdof: SDOFParams) -> dict[str, float]:
    """计算方程中反复使用的派生动力学参数。"""

    m_eq = kg_to_ns2_per_mm(sdof.mass_kg)
    omega_n = 2.0 * np.pi * sdof.natural_frequency_hz
    xi = sdof.damping_ratio
    stiffness = m_eq * omega_n**2
    damping = 2.0 * xi * omega_n * m_eq
    omega_spindle = 2.0 * np.pi * sdof.spindle_rpm / 60.0
    return {
        "m_eq": m_eq,
        "omega_n": omega_n,
        "xi": xi,
        "k": stiffness,
        "c": damping,
        "omega_spindle": omega_spindle,
        "T_rev": 2.0 * np.pi / omega_spindle,
    }


def f0_f1(t: float, fsc: LinearFourierForceModel, sdof: SDOFParams) -> tuple[float, float]:
    """计算参考模型中的 f0(t) 和 f1(t)。

    f0/f1 把傅里叶力模型和结构动力学方程耦合起来，是后续固定点求解的时变项。
    """

    dyn = sdof_derived_params(sdof)
    m_eq = dyn["m_eq"]
    stiffness = dyn["k"]
    omega = dyn["omega_spindle"]
    basis = fourier_basis(t, omega, fsc.n_harmonics)
    f0_val = np.dot(fsc.p_const, basis) / m_eq + stiffness * sdof.nominal_rdoc / m_eq
    f1_val = np.dot(fsc.p_linear, basis) / m_eq - stiffness / m_eq
    return float(f0_val), float(f1_val)


def solve_steady_state_one_period(
    fsc: LinearFourierForceModel,
    sdof: SDOFParams,
    n_substeps: int = 200,
    t0: float = 0.0,
    return_force: bool = True,
) -> SteadyStateResult:
    """求一周期稳态响应。

    该函数复现参考脚本中的半解析固定点法：A0 用矩阵指数精确传播，
    A1(t) 和 B(t) 用梯形公式离散，最后求解周期映射的固定点。
    """

    dyn = sdof_derived_params(sdof)
    xi = dyn["xi"]
    omega_n = dyn["omega_n"]
    period = dyn["T_rev"]
    tau = period / n_substeps

    a0 = np.array(
        [
            [-xi * omega_n, 1.0],
            [(xi * omega_n) ** 2, -xi * omega_n],
        ],
        dtype=float,
    )
    # A0 是常系数部分，可以通过 expm(A0*tau) 精确推进一个小步长。
    exp_a0_tau = expm(a0 * tau)
    identity = np.eye(2)
    times = np.array([t0 + i * tau for i in range(n_substeps + 1)], dtype=float)

    a1_list: list[np.ndarray] = []
    b_list: list[np.ndarray] = []

    # A1(t) 和 B(t) 是时变项，需要在每个离散时刻先计算出来。
    for ti in times:
        f0i, f1i = f0_f1(ti, fsc, sdof)
        a1_list.append(np.array([[0.0, 0.0], [f1i, 0.0]], dtype=float))
        b_list.append(np.array([0.0, f0i], dtype=float))

    c_list: list[np.ndarray] = []
    d_list: list[np.ndarray] = []

    # 每个小区间都形成一次仿射映射：state_i = C_i * state_{i-1} + D_i。
    for i in range(1, n_substeps + 1):
        a1_prev = a1_list[i - 1]
        a1_curr = a1_list[i]
        b_prev = b_list[i - 1]
        b_curr = b_list[i]

        matrix = identity - 0.5 * tau * a1_curr
        cond_matrix = np.linalg.cond(matrix)
        if cond_matrix > 1e12:
            raise np.linalg.LinAlgError(
                f"[I - tau/2 * A1(t_i)] 病态，cond={cond_matrix:.3e}"
            )

        c_step = np.linalg.solve(matrix, exp_a0_tau + 0.5 * tau * exp_a0_tau @ a1_prev)
        d_step = np.linalg.solve(matrix, 0.5 * tau * (exp_a0_tau @ b_prev + b_curr))
        c_list.append(c_step)
        d_list.append(d_step)

    phi = np.eye(2)
    g = np.zeros(2)
    # 合成整周期映射：state(T) = Phi * state(0) + G。
    for i in range(n_substeps):
        g = c_list[i] @ g + d_list[i]
        phi = c_list[i] @ phi

    fixed_matrix = identity - phi
    cond_fixed = np.linalg.cond(fixed_matrix)
    if cond_fixed > 1e12:
        raise np.linalg.LinAlgError(f"(I - Phi) 病态，cond={cond_fixed:.3e}")

    # 周期稳态要求 state(0) = state(T)，因此求解固定点 x0_star。
    x0_star = np.linalg.solve(fixed_matrix, g)

    state = np.zeros((n_substeps + 1, 2), dtype=float)
    state[0, :] = x0_star
    # 从固定点出发，再推进一周期，用于得到 q(t)、u(t) 和力信号。
    for i in range(n_substeps):
        state[i + 1, :] = c_list[i] @ state[i, :] + d_list[i]

    q_actual = state[:, 0]
    qdot = state[:, 1] - xi * omega_n * q_actual
    # q_actual 是实际径向切深；减去名义 ae 后才是弹性位移 u(t)。
    u_deflection = q_actual - sdof.nominal_rdoc

    if return_force:
        force = np.array([force_from_model(fsc, q_actual[i], ti) for i, ti in enumerate(times)], dtype=float)
    else:
        force = np.array([], dtype=float)

    return SteadyStateResult(
        times=times,
        q_actual=q_actual,
        u_deflection=u_deflection,
        qdot=qdot,
        state=state,
        force=force,
        phi=phi,
        g=g,
        x0_star=x0_star,
        a0=a0,
    )
