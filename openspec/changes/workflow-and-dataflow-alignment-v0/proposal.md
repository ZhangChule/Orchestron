# workflow-and-dataflow-alignment-v0

## 背景

当前项目已经出现了最小工作流执行能力：前端能够表达工艺节点、虚拟加工节点和部分逻辑节点，也能维护运行状态、节点结果、事件日志和快照。但这些能力是在多轮探索中逐步形成的，之前的 OpenSpec changes 没有真正作为稳定的 Comet 工作流边界发挥作用，且部分旧 change 之间存在语义冲突。

因此，本 change 重新以 `/comet-open` 的方式整理当前阶段目标：先不继续堆叠新功能，而是把“工作流执行”和“数据流更新”对齐，尤其是把工艺参数在多次虚拟加工之间的版本关系定义清楚。

## 问题

当前最关键的问题不是能否运行节点，而是运行后的数据归属不够明确：

- 多次虚拟加工节点之间缺少明确的工艺参数 base version；
- `parameter-update` 容易表现为对当前状态的直接修改，重复运行时可能重复叠加；
- 节点结果没有稳定表达“由哪些输入、哪一版工艺参数、哪一次执行产生”；
- snapshot 和 event log 能保存数据，但还不足以解释一次工艺调试过程；
- 全流程重跑、从某节点继续运行、只重跑过期节点等执行模式尚未区分。

## 目标

本 change 的目标是建立一层清晰的设计约束，使后续实现能够围绕以下语义展开：

1. 每个虚拟加工节点定义一次工艺参数 base version。
2. 虚拟加工前的多种工艺节点、补偿节点、逻辑节点，都是在“下一次虚拟加工的工艺参数 base”上产生修改意图。
3. 参数修改应表达为可追踪、可幂等的 patch，而不是不可区分的重复状态叠加。
4. 每个节点结果应能追溯其输入、参数版本、运行编号和结果版本。
5. 工作流执行模式应从单一“全流程重跑”扩展出后续可实现的 `run all`、`run from selected`、`rerun stale only`、`resume from snapshot`。

## 范围

本 change 当前只写 Comet/OpenSpec 文档：

- 重写 `proposal.md`、`design.md`、`tasks.md` 为中文；
- 删除之前未能稳定发挥 Comet 作用的旧 OpenSpec change 文档；
- 不修改任何业务代码；
- 不修改 workflow 前端运行逻辑；
- 不修改 process_apps；
- 不修改 virtual_machining_platform；
- 不修改 Unity Build；
- 不修改 `/prediction/wall-error`。

## 非目标

本 change 不实现：

- 新执行器；
- 条件分支图执行；
- 参数 patch 运行时代码；
- 节点缓存或 stale propagation 代码；
- Unity 可视化重构；
- 后端 orchestration service；
- unified manifest registry；
- STL / voxel / tri-dexel / geometry_artifact contract。

## 验收标准

- 当前 active change 只保留 `workflow-and-dataflow-alignment-v0` 的中文 proposal/design/tasks；
- 文档明确说明虚拟加工节点如何定义工艺参数 base version；
- 文档明确说明虚拟加工前的工艺节点如何面向下一次虚拟加工 base 产生参数修改；
- 文档明确区分当前只设计、不实现；
- 项目运行代码不受影响。
