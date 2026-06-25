---
comet_change: virtual-machining-thickness-error-field-semantics
role: technical-design
canonical_spec: openspec
---

# Virtual Machining Thickness Error Field Semantics Design

## 设计目标

本设计将 virtual machining 的壁厚误差场链路拆成两个可验证阶段：

1. **A 阶段：前端语义闭环，后端保持兼容标量输入。**
   先修正补偿值符号，建立设计加工面壁厚、执行加工面壁厚、当前壁厚、执行面误差、计算实际壁厚、设计面误差之间的关系，并让 Unity payload 使用设计面壁厚误差。

2. **C 阶段：扩展后端 schema 支持每关键点执行径向切深。**
   在 A 阶段语义稳定后，再让后端一次请求接收矩阵化或每点化的 `execution_radial_depth`，避免长期依赖标量降级。

本设计不修改 Unity Build，不修改壁厚误差核心求解逻辑，不引入 voxel / tri-dexel geometry contract。

## 当前事实

当前后端 `/prediction/wall-error` 使用：

- `process.radial_depth`：当前标量径向切深输入；
- `key_points[].stiffness`：每个关键点刚度；
- `key_points[].id`：刚度矩阵索引，用于推导 backend 坐标。

当前后端返回的 `points[].error` 应解释为：

```text
execution_surface_error_field
```

它是相对于执行加工面的壁厚误差，不应直接作为最终设计面误差云图输入。

## 核心数据语义

补偿值采用与 `average_error` 同号的语义：

```text
compensation_value = same_sign_as(average_error)
execution_surface_thickness = design_surface_thickness - compensation_value
```

执行径向切深的正确矩阵关系为：

```text
execution_radial_depth_field[key_point]
  = current_thickness_field[key_point] - execution_surface_thickness
```

后端原始误差后处理为：

```text
computed_actual_thickness_field[key_point]
  = execution_surface_thickness + execution_surface_error_field[key_point]

design_surface_error_field[key_point]
  = computed_actual_thickness_field[key_point] - design_surface_thickness
```

Unity payload 中的 `points[].error` 应来自：

```text
design_surface_error_field[key_point]
```

而不是 raw backend `points[].error`。

## A 阶段方案：前端语义闭环，后端兼容标量

A 阶段不扩展后端 schema。workflow 前端负责建立壁厚语义并完成后处理。

### 输入前处理

前端维护或推导：

- `design_surface_thickness`
- `compensation_value`
- `execution_surface_thickness`
- `current_thickness_field`
- `execution_radial_depth_field`

在后端仍只接收 `process.radial_depth` 的条件下，A 阶段将矩阵化 `execution_radial_depth_field` 降级为一个兼容标量：

```text
compatible_radial_depth = mean(execution_radial_depth_field)
```

该字段只作为临时兼容输入，不代表系统已经完整支持每点执行径向切深。

### 后端调用

调用现有 `/prediction/wall-error`：

```text
process.radial_depth = compatible_radial_depth
key_points[].stiffness = existing stiffness input
```

后端 solver 和 force model 保持不变。

### 输出后处理

后端返回后，前端将每个点的 raw `error` 保存为：

```text
execution_surface_error_field[key_point]
```

再计算：

```text
computed_actual_thickness_field[key_point]
design_surface_error_field[key_point]
```

最终 Unity payload 使用 `design_surface_error_field`。

### A 阶段输出

A 阶段完成后，应能在 workflow runtime / snapshot / manual verification 中区分：

- 兼容标量径向切深；
- 原始执行面误差；
- 计算实际壁厚；
- 设计面误差；
- Unity payload 使用的误差字段。

## C 阶段方案：后端 schema 支持每关键点执行径向切深

C 阶段在 A 阶段完成后推进。目标是让后端一次请求接收每关键点的执行径向切深。

建议 schema 方向：

```json
{
  "key_points": [
    {
      "id": "K1_J1_I1",
      "stiffness": 352.1,
      "execution_radial_depth": 0.28558
    }
  ]
}
```

兼容规则：

- 如果 `key_points[].execution_radial_depth` 存在，优先使用每点值；
- 如果不存在，继续使用旧的 `process.radial_depth`；
- 旧请求保持可运行。

后端核心 `solve_wall_error(...)` 不变，但每个点调用时使用该点自己的 `execution_radial_depth`。

## 不采用方案 B 的原因

方案 B 是前端按关键点循环调用后端。它可以保留后端 schema 不变，但会引入：

- N 次 API 请求；
- 重复 force model 标定；
- 前端 orchestration 复杂度；
- 更难解释的 event log 和 snapshot。

因此它不作为主线方案，仅作为调试 fallback。

## 测试策略

### A 阶段测试

- 单元测试补偿值符号：`compensation_value` 与 `average_error` 同号。
- 单元测试 `execution_surface_thickness`。
- 单元测试 `execution_radial_depth_field` 到兼容标量的降级。
- 单元测试 raw execution error 到 design surface error 的后处理。
- Adapter 测试：Unity payload `points[].error` 使用设计面误差。
- 人工查验：按 change 内 `manual-verification.md` 检查每个中间字段。

### C 阶段测试

- 后端 schema 兼容测试：旧请求仍成功。
- 后端每点径向切深测试：不同关键点使用不同 `execution_radial_depth`。
- 前后端集成测试：workflow 发送每点执行径向切深后，结果点数量、刚度点对应关系和 Unity payload 保持稳定。

## 风险与约束

- A 阶段的平均径向切深是临时兼容策略，会损失每点差异，不能用于宣称完整矩阵化计算已完成。
- C 阶段会改变后端请求 schema，需要明确兼容规则并补充测试。
- 当前 `computed_actual_thickness_field` 暂不自动作为下一次虚拟加工的 `current_thickness_field`；该能力应由后续独立 change 处理。
- Unity Build 不应参与本次语义修正，Unity 只消费已经转换好的设计面误差场。

## 进入 build 前的边界

build 阶段应先做 A 阶段，且只在 A 阶段验收通过后再进入 C 阶段。

A 阶段验收：

- 不改后端 schema；
- 不改 solver；
- Unity payload 仍可驱动当前 Unity Build；
- 人工查验能看到 raw execution error 与 design surface error 的差异。

C 阶段验收：

- 后端兼容旧请求；
- 后端支持每关键点 `execution_radial_depth`；
- workflow 不再只能依赖平均径向切深。
