# 设计：workflow-and-dataflow-alignment-v0

## 设计目标

本设计解决一个核心问题：工作流图中的节点执行顺序，必须和数据流中的工艺参数版本、节点结果版本、事件记录和快照恢复语义对齐。

当前阶段不追求完整最终架构，而是先定义最小一致语义，使后续实现不再把“全流程重跑”和“数据状态更新”混在一起。

## 核心判断

有限状态机可以描述运行状态，例如 `idle`、`running`、`paused`、`completed`。但 Orchestron 的工艺调试还需要表达：

- 哪个虚拟加工节点冻结了哪一版工艺参数；
- 哪个工艺节点基于哪次预测结果产生补偿；
- 哪个逻辑节点决定继续、停止或更新参数；
- 哪次参数更新属于哪一次虚拟加工之前的候选参数；
- 哪些节点结果在修改后已经过期。

因此，本系统应采用“工作流图 + 数据流状态 + 事件追踪”的混合模型，而不是只采用有限状态机。

## 1. 虚拟加工节点是工艺参数 base version 边界

每个虚拟加工节点都应定义一次 `ProcessParameterBaseVersion`。它表示该次 wall-error prediction 所使用的工艺参数基准。

```text
候选工艺参数
    |
    v
虚拟加工节点 VM-N
    |
    +-- 冻结 base_version_N
    +-- 调用 wall-error prediction
    +-- 产生 wall_error_result_N
```

最小字段建议：

- `base_version_id`：工艺参数基准版本标识；
- `virtual_node_id`：定义该 base 的虚拟加工节点；
- `run_id`：所属运行；
- `parameters`：完整工艺参数；
- `coordinate_system`：加工坐标系；
- `source_patch_ids`：生成该 base 所应用的参数 patch；
- `created_at`：创建时间；
- `description`：可读说明。

其中 `parameters` 至少应包含：

- 主轴转速；
- 进给速度；
- 轴向切深；
- 径向切深；
- 加工坐标系引用或坐标变换引用。

## 2. 虚拟加工前的工艺节点作用于下一次 base

在两个虚拟加工节点之间，工艺节点和逻辑节点不应修改前一次虚拟加工已经冻结的 base。它们应产生面向下一次虚拟加工的参数修改意图。

```text
VM-1 冻结 base_1
  |
  v
VM-1 输出 wall_error_result_1
  |
  v
condition / WTC / parameter-update / human-review
  |
  v
生成 parameter patches
  |
  v
VM-2 应用 patches 并冻结 base_2
```

这意味着：虚拟加工节点之前的多种工艺节点，是在“下一次虚拟加工工艺参数 base”上进行修改，而不是回头改写历史结果。

## 3. 参数更新应是幂等 patch

`parameter-update` 不应只是直接修改 `process_parameters`。更稳定的表达是 `ParameterPatch`。

最小字段建议：

- `patch_id`：参数修改标识；
- `target_base_version_id`：目标候选 base；
- `source_result_ref`：来源结果，例如补偿计划；
- `target_path`：目标参数路径；
- `operation`：`replace`、`add`、`scale`；
- `value`：修改值；
- `created_by_node_id`：创建该 patch 的节点；
- `applied_to_base_version_id`：已应用到哪个 base；
- `created_at`：创建时间。

幂等规则：

- 同一个 patch 不能对同一个 base 重复应用；
- 全流程重跑时，应重新计算或复用 patch，而不是无条件叠加；
- 参数更新应能解释“从哪个结果来，改了哪个参数，如何改，应用到哪次虚拟加工 base”。

## 4. 节点结果需要版本化

每个可执行节点应产生 `NodeResultVersion`，用于连接输入、输出和执行事件。

最小字段建议：

- `node_result_version_id`；
- `node_id`；
- `node_run_id`；
- `execution_index`；
- `input_fingerprint`；
- `parameter_base_version_id`；
- `result_summary`；
- `raw_response_ref`；
- `created_at`。

`input_fingerprint` 初期不需要复杂 hash，可以先使用稳定 JSON 摘要。它的作用是判断节点输入是否变化，从而决定结果是否 stale。

## 5. 运行模式需要显式区分

后续实现不应只有“全流程运行”。至少需要设计以下运行模式：

- `run all`：从当前初始状态完整运行；
- `run from selected`：从选中节点开始运行，复用上游已有结果；
- `rerun stale only`：只重跑输入已变化的节点及其下游；
- `resume from snapshot`：从导入快照恢复后继续运行或重新运行。

当前行为可以继续作为默认 `run all`，但不应把它误认为唯一语义。

## 6. stale 数据传播

当以下内容变化时，节点结果应被标记为 stale：

- 节点配置；
- 上游节点结果版本；
- 工艺参数 base version；
- 参数 patch 列表；
- 工件选择或坐标系；
- adapter 或 endpoint 版本；
- workflow 连线结构。

被标记为 stale 的结果不应静默参与后续决策，除非用户明确选择复用历史结果。

## 7. event log 和 snapshot 的表达要求

事件日志应从“记录发生了什么”升级为“解释为什么发生”。

建议后续增加字段：

- `event_sequence`；
- `execution_index`；
- `node_run_id`；
- `node_label`；
- `base_version_before`；
- `base_version_after`；
- `result_version_id`；
- `patch_ids`；
- `state_change_summary`；
- `skip_reason`。

snapshot 应至少保存：

- workflow graph；
- WorkflowState；
- ProcessParameterBaseVersion 列表；
- ParameterPatch 列表；
- NodeResultVersion 列表；
- runtime metrics；
- event log；
- run mode；
- schema version；
- timestamp。

## 8. 后续执行草图

```text
选择 run mode
  |
  v
解析可运行节点
  |
  v
为虚拟加工节点解析或冻结参数 base
  |
  v
执行节点并产生 NodeResultVersion
  |
  v
逻辑/补偿节点产生 ParameterPatch
  |
  v
传播 stale 状态
  |
  v
记录可读 event trace
  |
  v
导出 snapshot
```

## 当前不做

- 不修改运行代码；
- 不修改 Unity；
- 不修改 `/prediction/wall-error`；
- 不修改 WTC / ARPPL 后端；
- 不实现完整条件分支执行器；
- 不实现完整缓存系统；
- 不设计几何数据正式 contract。
