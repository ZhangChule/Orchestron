# workflow-dataflow-alignment-build-v0 验收方案

## 目标

验证当前 workflow runtime 是否满足本 change 的核心目的：

- workflow 连线表达和数据流传递一致；
- 多阶段虚拟加工中的工艺参数 base、patch、result version 可追踪；
- 修改参数、修改流程、修改条件后，旧结果不会静默参与决策；
- 当用户从下游节点继续运行且上游结果 stale 时，runtime 应先重算 stale 上游，再继续运行下游；
- snapshot 能恢复 graph、WorkflowState、base、patch、result version 和 event log。

## 前置条件

1. 启动 workflow 前端和相关后端服务。
2. 打开 workflow 前端页面。
3. 虚拟加工节点的刚度文件统一选择：

```text
D:\PhD\ARPPL_code\process_apps\thinwall-dt\frontend\public\stiffness.txt
```

不同虚拟加工节点在本次验收中可以重复使用该文件。

## 实验链路

使用最小闭环 demo：

```text
VM-1
  -> Condition
  -> Wall Thickness Compensation
  -> Parameter Update
  -> VM-2
  -> Stop
```

其中：

- VM-1 生成第一版 wall-error result 和 base_1；
- Condition 判断 wall error 是否超过阈值；
- WTC 生成 compensation_plan；
- Parameter Update 生成 ParameterPatch；
- VM-2 在应用 patch 后冻结 base_2 并重新预测；
- Stop 判断是否满足 tolerance 或 maxIterations。

## 验收 A：run all 基线

步骤：

1. 点击 `Load Closed-loop Demo`。
2. 为 VM-1 和 VM-2 选择同一个 stiffness 文件。
3. 点击 `Run Workflow`。
4. 打开浏览器 console，检查：

```js
window.workflowRuntimeState.run_mode
window.workflowRuntimeState.parameter_base_versions
window.workflowRuntimeState.parameter_patches
window.workflowRuntimeState.node_result_versions
window.workflowRuntimeState.event_log.map(e => ({
  seq: e.event_sequence,
  type: e.event_type,
  node: e.node_id,
  base: e.base_version_after,
  result: e.result_version_id,
  patches: e.patch_ids,
  summary: e.state_change_summary || e.summary
}))
```

期望：

- `run_mode` 为 `run_all`；
- VM-1 和 VM-2 均产生 `base_version_created`；
- 每个执行节点均产生 `result_version_created`；
- Parameter Update 产生 `parameter_patch_created`；
- VM-2 执行前能看到 patch 被应用或跳过事件；
- Unity preview 仍能保持现有行为。

## 验收 B：参数修改后从下游继续运行

步骤：

1. 完成验收 A。
2. 修改 VM-1 的工艺参数，例如：
   - `spindle_speed`
   - `feed_rate`
   - `axial_depth`
   - `radial_depth`
3. 保存 VM-1 配置。
4. 确认 VM-1 及直接下游 result 被标记 stale。
5. 选中 WTC 节点。
6. 点击 `Run From Selected`。

期望：

- 不应阻断运行；
- event log 的 `run_started` 中应包含 `expanded_from_node_ids`，指向 stale 的上游节点，例如 VM-1；
- runtime 应先重新执行 stale 上游，再执行 WTC 及其下游；
- 新 VM 执行应使用修改后的工艺参数；
- 新 result version 的 `input_fingerprint` 应反映当前节点配置和参数状态；
- 旧 result version 保留为历史，但新 result 成为当前 active result。

## 验收 C：流程修改与多入多出连线

步骤：

1. 在 demo 基础上新增或调整连线，使同一个输出连接多个输入。
2. 再让同一个输入接收多个输出。
3. 在 console 检查：

```js
window.workflowRuntimeState
```

以及前端内部 graph 的连线表现。

期望：

- 一个输出可以连接多个输入；
- 一个输入也可以连接多个输出；
- 新连线不应删除已有同目标输入的旧连线；
- 连线变化应触发相关结果 stale；
- run from selected 时，若上游 stale，应纳入 stale 上游重跑，而不是静默复用旧结果。

## 验收 D：条件触发修改

步骤：

1. 完成一次 run all。
2. 修改 Condition 阈值：
   - 先设置为容易通过；
   - 再设置为不通过。
3. 保存 Condition 配置。
4. 分别从 Condition 或其下游节点运行。

期望：

- Condition 修改后其 result version 标记 stale；
- 从下游运行时应先重新执行 stale Condition；
- condition 为 false 时应停止或跳过后续补偿链路，event log 中应能解释原因；
- condition 为 true 时应继续 WTC / Parameter Update / VM-2 / Stop。

## 验收 E：snapshot 导出与恢复

步骤：

1. 完成一次 run all。
2. 点击 `Export Snapshot`。
3. 刷新页面。
4. 点击 `Import Snapshot` 导入刚才的 JSON。
5. 检查：

```js
window.workflowRuntimeState.parameter_base_versions
window.workflowRuntimeState.parameter_patches
window.workflowRuntimeState.node_result_versions
window.workflowRuntimeState.event_log
```

6. 导入后分别测试：
   - `Run Workflow`
   - `Run From Selected`

期望：

- graph、WorkflowState、base、patch、result version、runtime_metrics、event_log 均恢复；
- event log 能解释 base / patch / result version 的关系；
- 导入后可以重新 run all；
- 导入后可以从选中节点继续运行；
- 若存在 stale 上游，run from selected 应自动纳入 stale 上游重跑。

## 验收通过标准

本 change 只有在以下条件同时满足时才建议进入 verify/archive：

- run all、run from selected、resume from snapshot 均可用；
- 多入多出连线不破坏图结构；
- 修改参数后不会复用旧 stale result；
- 修改流程后 stale 能被标记，并在继续运行时被重算；
- 修改条件后 condition result 不会静默复用旧判断；
- event log 能解释：
  - 哪个 VM 冻结了哪个 base；
  - 哪个 parameter-update 创建了哪个 patch；
  - patch 应用到了哪个 base；
  - 哪个节点产生了哪个 result version；
  - run from selected 是否因为 stale 上游扩展了执行范围；
- snapshot 能恢复完整实验追踪信息；
- `/prediction/wall-error`、Unity Build、WTC/ARPPL 后端行为未被修改。

## 当前未覆盖

- 不实现完整 `rerun stale only`；
- 不验证复杂条件分支图执行器；
- 不验证多 VM 场景在 Unity 画面中的一一对应显示；
- 不验证 STL / voxel / tri-dexel geometry contract。
