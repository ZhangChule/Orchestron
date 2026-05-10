from __future__ import annotations

import re
from dataclasses import dataclass


POINT_ID_PATTERN = re.compile(r"^K(?P<k>\d+)_J(?P<j>\d+)_I(?P<i>\d+)$", re.IGNORECASE)


@dataclass(frozen=True)
class MatrixIndex:
    i: int
    j: int
    k: int


@dataclass(frozen=True)
class WorkpieceDimensions:
    length: float
    height: float
    thickness: float
    base_width: float
    base_height: float


def parse_matrix_point_id(point_id: str) -> MatrixIndex:
    match = POINT_ID_PATTERN.match(point_id.strip())
    if not match:
        raise ValueError(f"刚度测点 id '{point_id}' 无效，应为 K<k>_J<j>_I<i> 格式。")
    return MatrixIndex(
        i=int(match.group("i")) - 1,
        j=int(match.group("j")) - 1,
        k=int(match.group("k")) - 1,
    )


def matrix_shape_from_ids(point_ids: list[str]) -> tuple[int, int, int]:
    indices = [parse_matrix_point_id(point_id) for point_id in point_ids]
    return (
        max(index.i for index in indices) + 1,
        max(index.j for index in indices) + 1,
        max(index.k for index in indices) + 1,
    )


def coordinate_from_matrix_index(
    index: MatrixIndex,
    shape: tuple[int, int, int],
    workpiece: WorkpieceDimensions,
    radial_depth: float,
) -> tuple[float, float, float]:
    """把 K/J/I 刚度矩阵索引映射成工件坐标。

    K 沿走刀方向，对应工件 X。
    J 沿壁高方向采样，从总高 H1 向底座高度 H2 递减。
    I 表示径向多次走刀，从壁厚中心 t/2 开始按径向切深递减。
    """
    i_count, j_count, k_count = shape
    _ = i_count
    x = workpiece.length * index.k / (k_count - 1) if k_count > 1 else workpiece.length * 0.5
    z = (
        workpiece.height - (workpiece.height - workpiece.base_height) * index.j / (j_count - 1)
        if j_count > 1
        else workpiece.height
    )
    y = max(-workpiece.thickness * 0.5, workpiece.thickness * 0.5 - index.i * radial_depth)
    return x, y, z
