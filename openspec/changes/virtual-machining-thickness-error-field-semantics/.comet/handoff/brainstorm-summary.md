# Brainstorm Summary

- Change: `virtual-machining-thickness-error-field-semantics`
- Date: 2026-06-23
- Status: 用户已确认技术方案：先 A 后 C

## 已确认事实

- Unity 云图问题已由坐标变换修复，当前不改 Unity Build。
- 当前后端壁厚误差计算输入主要是 `process.radial_depth` 和 `key_points[].stiffness`。
- 当前后端返回的 `points[].error` 应解释为执行面壁厚误差。
- 设计面壁厚误差应由后处理得到，并作为 Unity payload `points[].error`。
- 执行径向切深的正确公式是：

```text
execution_radial_depth_field[key_point]
  = current_thickness_field[key_point] - execution_surface_thickness
```

## 候选技术方案

### 方案 A：前端降级为标量，后端暂不变

前端计算 `execution_radial_depth_field`，再用平均值或代表值写入当前后端 `process.radial_depth`。

优点：

- 改动小；
- 后端 API 和算法完全不变；
- 容易快速验证补偿符号、设计面误差后处理和 Unity payload。

缺点：

- 丢失关键点级执行径向切深差异；
- 不能真正表达矩阵化执行径向切深。

### 方案 B：前端按关键点循环调用后端

前端为每个关键点构造单点请求，每次将该点的 `execution_radial_depth` 写入标量 `process.radial_depth`，后端仍不改 solver。

优点：

- 后端核心 solver 不变；
- 每个关键点可以使用自己的执行径向切深；
- 适合作为矩阵化能力的最小真实实现。

缺点：

- 请求次数从 1 次变成 N 次；
- force model 会重复标定，性能较差；
- 前端 adapter 复杂度增加。

### 方案 C：扩展后端 schema 支持每点径向切深

在后端请求中增加每关键点执行径向切深，例如 `key_points[].execution_radial_depth` 或单独的 `execution_radial_depth_field`。

优点：

- 数据语义最清晰；
- 一次请求即可保留关键点矩阵；
- 后续更适合扩展当前壁厚场传播。

缺点：

- 会修改后端 API schema；
- 需要更新请求构造、测试、文档和兼容逻辑；
- build 范围比前两个方案更大。

## 已确认方案

用户已确认采用“两步走”：

1. 当前 build 先采用方案 A，完成补偿符号、壁厚概念、后处理和 Unity payload 语义闭环；
2. 随后单独或同一 change 的后续任务采用方案 C，正式扩展后端 schema 支持每关键点执行径向切深。

不推荐方案 B 作为主线，因为它会引入较多前端 orchestration 复杂度，并且性能和可解释性都不如 schema 扩展。

## 测试策略

- 单元测试：补偿值符号、执行加工面壁厚、设计面误差后处理。
- Adapter 测试：Unity payload 使用设计面误差，不再直接使用 raw backend error。
- 后端兼容测试：旧请求仍可运行。
- 人工查验：按 `manual-verification.md` 对比 raw execution error、computed actual thickness、design surface error。

## 待用户确认

- 是否接受推荐方案：先 A 后 C。
- 如果希望本 change 直接进入 C，需要扩大 build 范围并明确后端 schema 兼容策略。
