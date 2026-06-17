# workflow-dataflow-alignment-build-v0

## 目标

在已有 workflow execution core v0 的基础上，逐步升级为 dataflow-aligned execution v0，使多阶段虚拟调试中的工艺参数版本、参数修改、节点结果版本、stale 状态、event log 和 snapshot 具有一致语义。

## 本阶段分片

- P1：Data model foundation，在 `WorkflowState` 中加入 `ProcessParameterBaseVersion`、`ParameterPatch`、`NodeResultVersion` 的最小结构，不改变现有运行行为。
- P2：Base freeze and idempotent patch，让虚拟加工节点冻结参数 base，并让 parameter-update 生成幂等 patch。
- P3：Result versioning and stale propagation，为节点结果生成版本和输入 fingerprint，并标记 stale。
- P4：Run modes and traceable snapshot，实现最小 run modes 与可解释 snapshot。

## 当前只执行

本次只执行 P1，不执行 P2-P4。

## 非目标

- 不修改 `/prediction/wall-error`。
- 不修改 Unity Build、Unity payload 或现有 preview 行为。
- 不修改 virtual machining / ARPPL / WTC 后端逻辑。
- 不新增 unified manifest registry。
- 不新增完整 FunctionBlock / Job / Artifact 系统。
- 不新增 STL / voxel / tri-dexel / geometry_artifact contract。
- 不重做前端交互。
