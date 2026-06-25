# 当前阶段人工查验文档

## 目的

本文档用于在本 change 的 build 前后手动检查壁厚误差场语义是否正确。它不是自动测试，也不是最终 geometry contract。

查验重点：

1. 后端输入是否能明确看到执行径向切深和关键点刚度；
2. 后端输出是否能作为执行面壁厚误差解释；
3. workflow 前端是否能得到设计加工面壁厚、执行加工面壁厚和当前壁厚；
4. Unity payload 中的 `points[].error` 是否来自设计面壁厚误差。

## 当前代码基线查验

### 1. 后端输入

检查请求体：

```json
{
  "process": {
    "radial_depth": 1.0
  },
  "key_points": [
    {
      "id": "K1_J1_I1",
      "stiffness": 352.1
    }
  ]
}
```

当前解释：

- `process.radial_depth`：执行径向切深兼容标量；
- `key_points[].stiffness`：关键点刚度；
- `key_points[].id`：刚度矩阵索引。

### 2. 后端输出

检查 `/prediction/wall-error` 返回：

```json
{
  "points": [
    {
      "id": "K1_J1_I1",
      "x": 0,
      "y": 3,
      "z": 55,
      "stiffness": 352.1,
      "error": 0.07
    }
  ],
  "summary": {
    "average_error": 0.06
  }
}
```

当前解释：

- `points[].error`：执行面壁厚误差；
- `summary.average_error`：执行面误差平均值。

### 3. Unity payload

检查浏览器控制台：

```js
window.workflowRuntimeState.visualization_sessions.at(-1).unity_payload
```

重点检查：

```js
const payload = window.workflowRuntimeState.visualization_sessions.at(-1).unity_payload
const errors = payload.points.map((point) => point.error)
[
  payload.points.length,
  Math.min(...errors),
  Math.max(...errors),
  payload.process.radialDepth
]
```

当前基线中，`payload.points[].error` 仍直接来自后端 `points[].error`。

## build 后目标查验

### 1. 补偿值符号

给定：

```text
average_error = 0.08558
design_surface_thickness = 1.0
```

期望：

```text
compensation_value = 0.08558
execution_surface_thickness = 1.0 - 0.08558 = 0.91442
```

不期望：

```text
compensation_value = -0.08558
```

### 2. 当前壁厚到执行径向切深

给定：

```text
current_thickness_field[K1_J1_I1] = 1.20
current_thickness_field[K2_J1_I1] = 1.18
design_surface_thickness = 1.0
compensation_value = 0.08558
execution_surface_thickness = 0.91442
```

期望：

```text
execution_radial_depth_field[K1_J1_I1] = 1.20 - 0.91442 = 0.28558
execution_radial_depth_field[K2_J1_I1] = 1.18 - 0.91442 = 0.26558
```

### 3. 执行面误差到设计面误差

给定：

```text
design_surface_thickness = 1.0
compensation_value = 0.08558
execution_surface_thickness = 0.91442
execution_surface_error_field[K1_J1_I1] = 0.02000
```

期望：

```text
computed_actual_thickness_field[K1_J1_I1]
  = 0.91442 + 0.02000
  = 0.93442

design_surface_error_field[K1_J1_I1]
  = 0.93442 - 1.0
  = -0.06558
```

### 4. Unity payload 误差来源

build 后应确认：

```text
Unity payload points[].error = design_surface_error_field[key_point]
```

而不是：

```text
Unity payload points[].error = raw backend execution_surface_error_field[key_point]
```

## 通过标准

- 能在 workflow 前端或 runtime state 中看到设计加工面壁厚。
- 能看到执行加工面壁厚。
- 能看到当前壁厚场或其临时默认值。
- 能看到原始后端执行面误差。
- 能看到后处理得到的计算实际壁厚。
- 能看到设计面壁厚误差。
- Unity payload 使用设计面壁厚误差。
- 后端核心误差计算函数未改变。
- Unity Build 未改变。

## 后续独立 change

本 change 完成后，建议单独开启：

```text
virtual-machining-thickness-field-propagation-v0
```

目标：

- 将 `computed_actual_thickness_field` 作为下一次虚拟加工的 `current_thickness_field`；
- 支持多工步壁厚场连续传播；
- 再讨论是否需要 geometry artifact / voxel / tri-dexel contract。
