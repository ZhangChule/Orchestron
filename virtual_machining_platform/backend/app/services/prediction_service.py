from __future__ import annotations

import numpy as np

from app.algorithms.calibration.fourier import calibrate_linear_fourier_model
from app.algorithms.common.coordinates import (
    WorkpieceDimensions,
    coordinate_from_matrix_index,
    matrix_shape_from_ids,
    parse_matrix_point_id,
)
from app.algorithms.cutting_force.mechanistic import MechanisticDefaults
from app.algorithms.error.wall_error import solve_wall_error
from app.algorithms.solver.steady_state import mass_kg_from_stiffness
from app.schemas.machining import KeyPointResult, PredictionSummary
from app.schemas.prediction import WallErrorPredictionRequest, WallErrorPredictionResponse
from app.utils.debug import debug_log


# 这两个模态常量沿用当前参考脚本里的取值。刚度仍然是每个测点单独传入；
# 模态质量会在后续求解器里根据“刚度 + 固有频率”反算。
DEFAULT_DAMPING_RATIO = 0.0083
DEFAULT_NATURAL_FREQUENCY_HZ = 60.5


def _summary(points: list[KeyPointResult]) -> PredictionSummary:
    errors = [point.error for point in points]
    return PredictionSummary(
        point_count=len(points),
        min_error=min(errors),
        max_error=max(errors),
        average_error=sum(errors) / len(errors),
    )


def predict_wall_error(request: WallErrorPredictionRequest) -> WallErrorPredictionResponse:
    # 前端传入的径向切深在后端被视为名义 ae。傅里叶标定使用 ae 的 +/-50%
    # 采样范围，先暂时和参考脚本保持一致；标定后的模型会复用于所有刚度测点。
    radial_depth = request.process.radial_depth
    radial_depth_samples = radial_depth * np.linspace(0.5, 1.5, 5)
    defaults = MechanisticDefaults()

    # 切削力仿真和傅里叶线性标定只依赖刀具、工艺和标定切深，不依赖单个测点刚度。
    # 因此这里每次请求只构建一次 force_model，避免在测点循环里重复做昂贵计算。
    force_model = calibrate_linear_fourier_model(
        tool=request.tool,
        process=request.process,
        radial_depth_samples=radial_depth_samples,
        n_harmonics=defaults.n_harmonics,
        defaults=defaults,
    )

    # 前端上传的刚度点只有 K1_J1_I1 这类 id 和 stiffness。后端先从全部 id
    # 推断矩阵维度，再结合工件尺寸和径向切深补齐真实几何坐标。
    shape = matrix_shape_from_ids([point.id for point in request.key_points])
    workpiece = WorkpieceDimensions(
        length=request.workpiece.length,
        height=request.workpiece.height,
        thickness=request.workpiece.thickness,
        base_width=request.workpiece.base_width,
        base_height=request.workpiece.base_height,
    )

    coordinate_debug = []
    mass_debug = []
    results: list[KeyPointResult] = []
    for point in request.key_points:
        # 这里是“前端矩阵索引”变成“后端工件坐标”的边界，所以显式保留
        # id 解析和坐标映射，方便后续核对刚度点是否对应到正确位置。
        index = parse_matrix_point_id(point.id)
        x, y, z = coordinate_from_matrix_index(
            index=index,
            shape=shape,
            workpiece=workpiece,
            radial_depth=radial_depth,
        )
        coordinate_debug.append({"id": point.id, "x": x, "y": y, "z": z, "stiffness": point.stiffness})
        mass = mass_kg_from_stiffness(point.stiffness, DEFAULT_NATURAL_FREQUENCY_HZ, DEFAULT_DAMPING_RATIO)
        mass_debug.append({"id": point.id, "stiffness": point.stiffness, "mass_kg": mass})
        # 每个测点使用自己的刚度进入求解器：求解器会反算模态质量、求一周期稳态响应，
        # 再把周期轨道转换成该测点的局部壁厚误差。
        error = solve_wall_error(
            force_model=force_model,
            stiffness=point.stiffness,
            nominal_radial_depth=radial_depth,
            damping_ratio=DEFAULT_DAMPING_RATIO,
            natural_frequency_hz=DEFAULT_NATURAL_FREQUENCY_HZ,
            tool_radius=request.tool.diameter * 0.5,
        )
        results.append(
            KeyPointResult(
                id=point.id,
                x=x,
                y=y,
                z=z,
                stiffness=point.stiffness,
                error=error,
            )
        )

    # 默认只保留两条预测日志：一条核对坐标和刚度的对应关系，一条查看最终误差。
    debug_log("prediction.coordinate_stiffness", coordinate_debug)
    debug_log("prediction.stiffness_mass", mass_debug)
    debug_log(
        "prediction.wall_errors",
        [{"id": point.id, "error": point.error} for point in results],
    )

    return WallErrorPredictionResponse(
        points=results,
        summary=_summary(results),
        message="wall error predicted by backend force/calibration/steady-state pipeline",
        model_version=request.model_version,
    )
