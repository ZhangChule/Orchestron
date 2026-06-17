# 任务清单

## 范围约束

- 当前允许修改：`workflow_platform/frontend` 中与 runtime state 直接相关的最小文件，以及本 change 文档。
- 当前禁止修改：`virtual_machining_platform/**`、`process_apps/**`、`UnityBuild/**`、`contracts/**`、`workflow_platform/docker/**`。
- 当前不提交 commit。

## Implementation Tasks

- [x] P1. Data model foundation
  - 在 `WorkflowState` 中加入 `ProcessParameterBaseVersion`、`ParameterPatch`、`NodeResultVersion` 的最小结构。
  - 提供最小构造 helper。
  - 不改变现有运行行为。

- [x] P2. Base freeze and idempotent patch
  - 虚拟加工节点执行前冻结参数 base。
  - `parameter-update` 生成幂等 `ParameterPatch`。

- [x] P3. Result versioning and stale propagation
  - 后续执行，不在本次执行。

- [x] P4. Run modes and traceable snapshot
  - 后续执行，不在本次执行。
