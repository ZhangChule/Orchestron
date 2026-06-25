# 设计说明

## 当前代码事实

### 后端输入

当前 virtual machining 后端的 `/prediction/wall-error` 请求包含：

- `process.radial_depth`：当前作为执行径向切深进入误差计算；
- `key_points[].stiffness`：每个关键点的刚度；
- `key_points[].id`：用于从 `K/J/I` 矩阵索引推导后端坐标；
- `workpiece`：用于坐标映射和工件尺寸约束。

关键代码位置：

- `virtual_machining_platform/backend/app/services/prediction_service.py`
  - 读取 `request.process.radial_depth`；
  - 基于 `radial_depth_samples` 标定 force model；
  - 对每个关键点调用 `solve_wall_error(...)`；
  - 返回 `KeyPointResult(id, x, y, z, stiffness, error)`。
- `virtual_machining_platform/backend/app/algorithms/common/coordinates.py`
  - 将 `K/J/I` 刚度矩阵索引转换为 backend 坐标。

### 前端 Unity payload

当前 workflow 前端将后端返回的误差点转换为 Unity payload：

- `workpiece`
- `process`
- `points`
- `toolpath`

关键代码位置：

- `workflow_platform/frontend/runtime/unityPreviewAdapter.js`
  - `buildUnityMachiningJobPayload(...)`
  - 负责误差点发送前坐标转换。

当前已验证可执行的 Unity payload 不应在本阶段被破坏。

## 核心概念

本 change 统一使用以下概念：

| 概念 | 英文建议名 | 类型 | 说明 |
| --- | --- | --- | --- |
| 设计加工面的壁厚 | `design_surface_thickness` | 标量 | 工艺设计目标面对应的目标壁厚，所有关键点相同。 |
| 执行加工面的壁厚 | `execution_surface_thickness` | 标量 | 实际执行加工面对应的壁厚，数值上等于设计加工面的壁厚减去误差补偿。 |
| 当前壁厚 | `current_thickness_field` | 矩阵/场 | 当前工件在各关键点的实际壁厚状态。当前阶段先作为输入概念，不强制实现完整历史传播。 |
| 执行径向切深 | `execution_radial_depth_field` | 矩阵/场 | 每个关键点的执行径向切深，数值上等于当前实际壁厚减去执行加工面的壁厚。 |
| 执行面壁厚误差 | `execution_surface_error_field` | 矩阵/场 | 后端当前误差计算直接得到的误差，相对于执行加工面。 |
| 计算实际壁厚 | `computed_actual_thickness_field` | 矩阵/场 | 执行加工面的壁厚加上执行面壁厚误差。 |
| 设计面壁厚误差 | `design_surface_error_field` | 矩阵/场 | 计算实际壁厚减去设计加工面的壁厚，应作为 Unity payload 的误差场输入。 |

## 数据关系

### 输入前处理

补偿建议值符号修正后：

```text
compensation_value 与 average_error 同号
execution_surface_thickness = design_surface_thickness - compensation_value
```

执行径向切深在未来应从标量变为关键点矩阵：

```text
execution_radial_depth_field[key_point]
  = current_thickness_field[key_point] - execution_surface_thickness
```

当前实现阶段可以先保留后端核心计算只接收标量 `process.radial_depth` 的事实，但设计上需要明确：

- 标量 `process.radial_depth` 是临时兼容输入；
- 后续 build 应增加前处理层，将矩阵化执行径向切深映射为后端可消费的输入；
- 在后端未支持矩阵化径向切深前，不应假装该能力已经完整存在。

### 误差计算保持不变

后端核心误差计算不改：

```text
execution_surface_error = solve_wall_error(
  execution_radial_depth,
  key_point_stiffness,
  ...
)
```

本 change 不修改 `solve_wall_error`、force model 标定、稳态求解或刚度质量换算。

### 输出后处理

后端当前返回的 `point.error` 解释为：

```text
execution_surface_error_field
```

需要增加后处理语义：

```text
computed_actual_thickness_field[key_point]
  = execution_surface_thickness + execution_surface_error_field[key_point]

design_surface_error_field[key_point]
  = computed_actual_thickness_field[key_point] - design_surface_thickness
```

展开后：

```text
design_surface_error_field[key_point]
  = execution_surface_error_field[key_point] - compensation_value
```

但实现时应保留中间概念，避免仅用化简公式导致语义丢失。

### Unity payload 输入

Unity payload 中 `points[].error` 应使用：

```text
design_surface_error_field
```

而不是后端原始返回的 `execution_surface_error_field`。

这可以让 Unity 云图表达相对于设计加工面的壁厚误差，而不是相对于执行加工面的残余误差。

## 分阶段方案

### 阶段 1：概念与观测对齐

- 标记当前代码中的 `process.radial_depth` 为“执行径向切深兼容标量”。
- 标记当前后端 `points[].error` 为“执行面壁厚误差”。
- 增加人工查验方法，确认后端输入、后端输出、Unity payload 三处数据。

### 阶段 2：补偿建议值符号修正

- 将 WTC / workflow 中的补偿建议值语义修正为与 `average_error` 同号。
- 对 `parameter-update add` 的含义重新检查，避免负号补偿和 add 叠加造成概念混乱。

### 阶段 3：workflow 前端引入壁厚语义

- 在 Virtual Machining 节点配置或 runtime state 中表达：
  - `design_surface_thickness`
  - `execution_surface_thickness`
  - `current_thickness_field`
- 当前阶段可以先允许 `current_thickness_field` 由刚度点顺序生成默认常量场。

### 阶段 4：执行径向切深矩阵化

- 从 `current_thickness_field` 和 `execution_surface_thickness` 计算 `execution_radial_depth_field`。
- 已确认采用“先 A 后 C”：
  - A 阶段先使用平均执行径向切深作为后端兼容标量，不修改后端 schema；
  - C 阶段再扩展后端 schema，正式支持每关键点执行径向切深；
  - 不采用前端按关键点循环调用后端作为主线方案。

### 阶段 5：设计面误差后处理

- 将后端返回的 `execution_surface_error_field` 转换为：
  - `computed_actual_thickness_field`
  - `design_surface_error_field`
- Unity payload 使用 `design_surface_error_field`。
- snapshot / event log 中保留 raw execution error 与 post-processed design error 的区别。

## 关键未知项

- C 阶段后端 schema 采用 `key_points[].execution_radial_depth` 还是单独的 `execution_radial_depth_field`。
- `current_thickness_field` 的初始来源：默认常量场、用户输入矩阵，还是来自上一工步计算结果。
- WTC 补偿建议值当前是否只在 workflow 前端被重新解释，还是需要 WTC 后端 response 字段语义同步。
- Unity payload 是否需要同时保留执行面误差和设计面误差用于调试显示。

## 当前决策

- 本阶段先写设计与任务，不修改代码。
- 保持 Unity Build 和当前可执行 payload 不变。
- 保持后端核心误差计算不变。
- 技术路线已确认：先 A 阶段完成前端语义闭环与后处理，再 C 阶段扩展后端 schema 支持每关键点执行径向切深。
