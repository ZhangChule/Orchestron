# 设计：workflow-dataflow-alignment-build-v0

## 约束来源

本 implementation change 以 `openspec/changes/workflow-and-dataflow-alignment-v0` 为设计约束。

## P1 设计

P1 只建立数据模型基础：

- `WorkflowState.process_parameter_base_versions`
- `WorkflowState.parameter_patches`
- `WorkflowState.node_result_versions`

同时提供最小 record constructor，用于后续 P2-P4 生成 base、patch 和 result version。

## 行为边界

P1 不改变当前节点执行顺序，不自动冻结 base，不让 `parameter-update` 生成 patch，不计算 stale，也不改变 snapshot UI。

## 后续阶段

P2-P4 将在用户明确要求后分别实现 base freeze、幂等 patch、result versioning、stale propagation、run modes 和 traceable snapshot。
