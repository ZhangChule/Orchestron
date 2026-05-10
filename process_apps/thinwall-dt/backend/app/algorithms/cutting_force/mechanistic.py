from __future__ import annotations

from dataclasses import dataclass, replace
from math import pi, radians
from typing import Literal

import numpy as np

from app.schemas.machining import ProcessInput, ToolInput


MillingMode = Literal["up", "down"]
ChipThicknessModel = Literal["rigid_1", "rigid_2", "rigid_3", "rigid_4"]


# region 切削力模型数据结构
# 这些 dataclass 是机理切削力模型的内部输入/输出结构。它们和 API schema 分开，
# 是为了让算法模块保持纯计算形态，不直接依赖 FastAPI 请求对象。
@dataclass(frozen=True)
class ToolGeometry:
    diameter: float
    helix_angle: float
    immersion_angle: float
    tooth_count: int
    phase0: float = 0.0

    @property
    def radius(self) -> float:
        return 0.5 * self.diameter


@dataclass(frozen=True)
class ForceCoefficients:
    ktc: float
    krc: float
    kac: float
    kte: float
    kre: float
    kae: float


@dataclass(frozen=True)
class CuttingConditions:
    spindle_speed: float
    axial_depth: float
    radial_depth: float
    feed_rate: float
    milling_mode: MillingMode = "down"

    @property
    def spindle_angular_speed(self) -> float:
        return 2.0 * np.pi * self.spindle_speed / 60.0


@dataclass(frozen=True)
class SimulationGrid:
    dt: float
    dz: float
    n_revolutions: int = 1

    @classmethod
    def from_samples_per_rev(
        cls,
        spindle_speed: float,
        samples_per_rev: int,
        dz: float,
        n_revolutions: int = 1,
    ) -> "SimulationGrid":
        dt = 60.0 / (spindle_speed * samples_per_rev)
        return cls(dt=dt, dz=dz, n_revolutions=n_revolutions)


@dataclass(frozen=True)
class MechanisticOptions:
    chip_thickness_model: ChipThicknessModel = "rigid_3"
    include_axial_force: bool = False


@dataclass(frozen=True)
class MechanisticForceCase:
    tool: ToolGeometry
    coeffs: ForceCoefficients
    cutting: CuttingConditions
    grid: SimulationGrid
    options: MechanisticOptions = MechanisticOptions()

    @property
    def feed_per_tooth(self) -> float:
        return self.cutting.feed_rate / (self.cutting.spindle_speed * self.tool.tooth_count)

    def with_radial_depth(self, ae: float) -> "MechanisticForceCase":
        return replace(self, cutting=replace(self.cutting, radial_depth=ae))


@dataclass(frozen=True)
class ForceSimulationResult:
    """一轮切削力仿真的完整时域结果。"""

    time: np.ndarray
    theta_ref: np.ndarray
    z: np.ndarray
    Fx: np.ndarray
    Fy: np.ndarray
    Fz: np.ndarray
    Ft: np.ndarray
    Fr: np.ndarray
    Fa: np.ndarray
    F: np.ndarray


@dataclass(frozen=True)
class MechanisticDefaults:
    # 这些默认值沿用当前参考脚本，用于在前端暂未提供切削力系数时闭环跑通算法。
    ktc: float = 1360.0
    krc: float = 698.0
    kac: float = 0.0
    kte: float = 6.07
    kre: float = 4.02
    kae: float = 0.0
    samples_per_rev: int = 4096
    dz: float = 0.01
    n_harmonics: int = 200
# endregion


# region 机理切削力模型核心函数
def build_time_grid(case: MechanisticForceCase) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """构造时间、参考角度和轴向离散网格。"""

    theta_step = case.cutting.spindle_angular_speed * case.grid.dt
    theta_hist = (
        np.arange(0.0, case.grid.n_revolutions * 2.0 * np.pi + 1e-15, theta_step)
        + case.tool.phase0
    )
    time = np.arange(theta_hist.size) * case.grid.dt
    z = np.arange(case.grid.dz, case.cutting.axial_depth + 1e-15, case.grid.dz)
    return time, theta_hist, z


def tooth_pitch(case: MechanisticForceCase) -> float:
    return 2.0 * np.pi / case.tool.tooth_count


def helix_lag(z: np.ndarray, case: MechanisticForceCase) -> np.ndarray:
    """计算螺旋角导致的轴向滞后角。"""

    return (z / case.tool.radius) * np.tan(case.tool.helix_angle)


def engagement_limits(case: MechanisticForceCase) -> tuple[float, float]:
    """根据径向切深和顺/逆铣方式计算切入角、切出角。"""

    ae = case.cutting.radial_depth
    radius = case.tool.radius
    if ae <= 0.0 or ae > 2.0 * radius:
        raise ValueError("radial_depth 必须满足 0 < ae <= tool diameter")

    mode = case.cutting.milling_mode.lower()
    if mode == "down":
        return np.pi - np.arccos((radius - ae) / radius), np.pi
    if mode == "up":
        return 0.0, np.arccos((radius - ae) / radius)
    raise ValueError("milling_mode 必须是 'down' 或 'up'")


def tooth_angles(theta_ref: np.ndarray, z: np.ndarray, case: MechanisticForceCase) -> np.ndarray:
    """计算每个时刻、每个刀齿、每个轴向微元的瞬时角位置。"""

    tooth_idx = np.arange(case.tool.tooth_count, dtype=float)
    theta_tooth = theta_ref[:, None] + tooth_idx[None, :] * tooth_pitch(case)
    psi = theta_tooth[:, :, None] - helix_lag(z, case)[None, None, :]
    return np.mod(psi, 2.0 * np.pi)


def chip_thickness(psi: np.ndarray, case: MechanisticForceCase) -> np.ndarray:
    """计算未变形切屑厚度。

    当前后端默认使用 rigid_3，以保持和参考脚本一致；其他模型保留为后续对比入口。
    """

    fz = case.feed_per_tooth
    radius = case.tool.radius
    tooth_count = case.tool.tooth_count
    feed_rate = case.cutting.feed_rate

    model = case.options.chip_thickness_model
    if model == "rigid_1":
        h = fz * np.sin(psi)
    elif model == "rigid_2":
        h = radius + fz * np.sin(psi) - np.sqrt(radius**2 - (fz * np.cos(psi)) ** 2)
    elif model == "rigid_3":
        h = (
            fz * np.sin(psi)
            - tooth_count / (2.0 * np.pi * radius) * fz**2 * np.sin(psi) * np.cos(psi)
            + 1.0 / (2.0 * feed_rate) * fz**2 * np.cos(psi) ** 2
        )
    elif model == "rigid_4":
        base = radius + (tooth_count * fz / (2.0 * np.pi)) * np.cos(psi)
        radicand = (
            1.0
            - 2.0 * fz * np.sin(psi) / base
            - fz**2 * np.sin(2.0 * psi) / base**2
            + fz**3 * np.sin(psi) * np.cos(psi) ** 2 / base**3
        )
        h = radius * (1.0 - np.sqrt(np.clip(radicand, 0.0, None)))
    else:
        raise ValueError(f"未知切屑厚度模型：{model}")

    return np.maximum(0.0, h)


def project_to_global(
    dFt: np.ndarray,
    dFr: np.ndarray,
    dFa: np.ndarray,
    psi: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """把局部切向/径向/轴向力投影到全局 X/Y/Z 坐标。"""

    dFx = -np.cos(psi) * dFt - np.sin(psi) * dFr
    dFy = np.sin(psi) * dFt - np.cos(psi) * dFr
    dFz = dFa
    return dFx, dFy, dFz


def simulate(case: MechanisticForceCase) -> ForceSimulationResult:
    """执行一次机理切削力仿真。

    这里用 NumPy 广播同时展开时间、刀齿和轴向微元三个维度，避免写三层循环。
    """

    time, theta_ref, z = build_time_grid(case)
    psi_entry, psi_exit = engagement_limits(case)
    psi = tooth_angles(theta_ref, z, case)
    engaged = ((psi >= psi_entry) & (psi <= psi_exit)).astype(float)
    h = chip_thickness(psi, case)
    ds = case.grid.dz / np.sin(case.tool.immersion_angle)

    dFt = engaged * (case.coeffs.ktc * h + case.coeffs.kte) * ds
    dFr = engaged * (case.coeffs.krc * h + case.coeffs.kre) * ds
    dFa = engaged * (case.coeffs.kac * h + case.coeffs.kae) * ds
    dFx, dFy, dFz = project_to_global(dFt, dFr, dFa, psi)

    Fx = dFx.sum(axis=(1, 2))
    Fy = dFy.sum(axis=(1, 2))
    Fz = dFz.sum(axis=(1, 2))
    Ft = dFt.sum(axis=(1, 2))
    Fr = dFr.sum(axis=(1, 2))
    Fa = dFa.sum(axis=(1, 2))
    F = np.sqrt(Fx**2 + Fy**2 + (Fz if case.options.include_axial_force else 0.0) ** 2)

    return ForceSimulationResult(time, theta_ref, z, Fx, Fy, Fz, Ft, Fr, Fa, F)


def slice_revolution(
    result: ForceSimulationResult,
    case: MechanisticForceCase,
    revolution_index: int = -1,
) -> ForceSimulationResult:
    """从多圈仿真结果中截取某一整圈。

    傅里叶标定只需要稳定的一圈力信号，所以这里把完整仿真结果裁剪成单圈。
    """

    samples_per_rev = int(round((60.0 / case.cutting.spindle_speed) / case.grid.dt))
    if samples_per_rev <= 0:
        raise ValueError("samples_per_rev 无效")

    n_rev = result.time.size // samples_per_rev
    idx = revolution_index if revolution_index >= 0 else n_rev - 1
    start = idx * samples_per_rev
    stop = start + samples_per_rev

    return ForceSimulationResult(
        time=result.time[start:stop] - result.time[start],
        theta_ref=result.theta_ref[start:stop],
        z=result.z,
        Fx=result.Fx[start:stop],
        Fy=result.Fy[start:stop],
        Fz=result.Fz[start:stop],
        Ft=result.Ft[start:stop],
        Fr=result.Fr[start:stop],
        Fa=result.Fa[start:stop],
        F=result.F[start:stop],
    )
# endregion


# region 前端 payload 到算法输入的适配
def build_force_case(
    tool: ToolInput,
    process: ProcessInput,
    radial_depth: float,
    defaults: MechanisticDefaults | None = None,
) -> MechanisticForceCase:
    """把前端 API 字段转换成机理模型内部的 ForceCase。"""

    defaults = defaults or MechanisticDefaults()
    cutting_mode_map: dict[str, MillingMode] = {
        "up_milling": "up",
        "down_milling": "down",
    }
    try:
        milling_mode = cutting_mode_map[process.cutting_mode]
    except KeyError as exc:
        raise ValueError("cutting_mode 必须是 'up_milling' 或 'down_milling'") from exc
    return MechanisticForceCase(
        tool=ToolGeometry(
            diameter=tool.diameter,
            helix_angle=radians(tool.helix_angle),
            immersion_angle=radians(tool.immersion_angle) if tool.immersion_angle else pi / 2.0,
            tooth_count=tool.teeth,
            phase0=0.0,
        ),
        coeffs=ForceCoefficients(
            ktc=defaults.ktc,
            krc=defaults.krc,
            kac=defaults.kac,
            kte=defaults.kte,
            kre=defaults.kre,
            kae=defaults.kae,
        ),
        cutting=CuttingConditions(
            spindle_speed=process.spindle_speed,
            axial_depth=process.axial_depth,
            radial_depth=radial_depth,
            feed_rate=process.feed_rate,
            milling_mode=milling_mode,
        ),
        grid=SimulationGrid.from_samples_per_rev(
            spindle_speed=process.spindle_speed,
            samples_per_rev=defaults.samples_per_rev,
            dz=defaults.dz,
            n_revolutions=1,
        ),
        options=MechanisticOptions(chip_thickness_model="rigid_3", include_axial_force=False),
    )


def predict_force_one_revolution(
    tool: ToolInput,
    process: ProcessInput,
    radial_depth: float,
    defaults: MechanisticDefaults | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """对给定径向切深预测一圈 Fy 力信号，供傅里叶标定使用。"""

    case = build_force_case(tool=tool, process=process, radial_depth=radial_depth, defaults=defaults)
    result = simulate(case)
    one_rev = slice_revolution(result, case, revolution_index=0)
    return one_rev.time, one_rev.Fy
# endregion
