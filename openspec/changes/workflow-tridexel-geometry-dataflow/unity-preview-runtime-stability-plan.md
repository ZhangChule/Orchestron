# Unity Preview Runtime Stability Plan

本文档是 `workflow-tridexel-geometry-dataflow` change 下关于 Unity preview runtime 稳定性的当前设计与调试方案。它覆盖此前较粗略的 preview runtime 方案，用于指导下一轮 build。

本阶段不修改 Unity Build，不修改 wall-error prediction，不修改 tri-dexel / thickness field 的数学定义。目标是让 workflow 前端用更可靠、更可审查的方式驱动 Unity preview，并避免把“前端可以发命令”误判为“Unity 场景已经完全稳定”。

## 1. 当前问题归纳

当前 VM preview 的前端命令序列大致是：

```text
Preview Cutting clicked
-> resetScene
-> ImportTriDexelImage(base64) 或 loadScene(scenePayload)
-> clear error cloud
-> refresh current VM error cloud
-> StartMachiningJob(payload)
-> wait Unity completed event
-> capture triDexelImageBase64 as GeometryArtifact
```

人工测试中出现的问题：

- `Ready for next preview` 显示后，下一次 VM preview 仍可能触发：
  - `table index is out of bounds`
  - `null function`
  - `memory access out of bounds`
  - `PlayerLoop internal function has been called recursively`
- VM3 首次 preview 可能 invalidated，但随后 VM4 又可能成功。
- VM1 -> VM2 -> VM3 -> VM4 都执行后，再次 preview VM2 可能导致 workflow 前端无响应。
- 现有 `Ready for next preview` 容易误导，因为它更多表达“前端恢复计时结束”，并不表达 Unity 内部场景、PlayerLoop、tri-dexel import、error cloud、machining job 全部稳定。

当前判断：问题更接近 Unity preview runtime 生命周期与前端命令序列之间的同步不足，而不是 wall-error prediction 计算错误。

## 2. 核心认知

### 2.1 `SendMessage` 返回不代表 Unity 内部完成

前端 `SendMessage` 成功只说明命令已经发送给 Unity，不代表 Unity 内部已经完成对应工作。例如：

- `resetScene` 返回，不等于旧场景对象已经全部销毁并重建完成；
- `ImportTriDexelImage(base64)` 返回，不等于 restored scene 已经完全可加工；
- `ShowWallErrorField(payload)` 返回，不等于旧 error cloud 已完全清除且新 cloud 已绑定到当前实体；
- `StartMachiningJob(payload)` 返回，不等于加工流程已经完成；
- `UnityMachiningCompleted` 到达，也不一定能证明 PlayerLoop 已经进入下一次 preview 的稳定空闲状态。

### 2.2 rerun 不是“必然成功”

`Preview invalidated: rerun this VM` 的含义应是：

```text
上一轮 preview session 已不可信，不能作为 fresh preview / fresh geometry artifact 使用。
```

它不应暗示 rerun 必然成功。rerun 可能成功，通常是因为 runtime warning 后前端触发了更干净的 reset/reload；但如果根因在当前 payload、artifact、toolpath、Unity 内部算法或 WebGL runtime 本身，rerun 仍可能失败。

### 2.3 等固定时间不是可靠稳定条件

VM2 -> VM3 与 VM3 -> VM4 即使等待时间相同，也不代表 Unity 内部状态相同。固定 1.8s 只能降低竞态概率，不能证明：

```text
上一轮 preview 完全结束；
本轮 scene import 完全稳定；
本轮 error cloud 已准确替换；
Unity runtime 没有残留 PlayerLoop / wasm 内存异常。
```

因此下一轮 build 应减少对固定等待时间的依赖，把状态定义为可审查的事件序列。

## 3. 最小设计原则

为了避免过分引入复杂系统，本 change 下只做前端 runtime 稳定性增强，不引入完整后端 orchestration 或复杂 artifact store。

原则：

1. **PreviewSession 仍是核心归属单位**：每次点击 VM preview 都必须绑定一个 session。
2. **状态必须由事件触发**：不要只靠 timer 宣称 ready。
3. **ready 必须收紧语义**：只有当前 session 满足最小稳定条件，才显示 `Ready for next preview`。
4. **runtime warning 使当前 session 不可信**：不得捕获 artifact，不得继续自动进入下游 preview。
5. **重复 warning 后进入人工恢复状态**：避免在已不健康的 Unity runtime 上继续发送命令导致页面无响应。
6. **调试优先可观察性**：先能说明每次 preview 卡在哪个阶段，再决定是否需要 Unity 侧新增回调。

## 4. 状态模型

### 4.1 UI 显示状态

Canvas 下方只在选中 VM 节点时显示 Unity preview 状态。建议使用以下文案：

```text
Unity Preview Status: Ready for next preview
Unity Preview Status: Preview running: VMx
Unity Preview Status: Waiting for Unity preview to settle
Unity Preview Status: Runtime recovered; rerun VMx before continuing
Unity Preview Status: Runtime unstable; reset Unity before next preview
Unity Preview Status: Reloading Unity runtime
Unity Preview Status: Preview invalidated: rerun this VM
```

其中：

- `Ready for next preview`：当前选中 VM 可开始 preview，且前一次 session 已满足最小稳定条件；
- `Preview running: VMx`：当前 VM preview 命令序列正在执行；
- `Waiting for Unity preview to settle`：已收到 completed event，但仍在进行短暂 settle 和状态确认；
- `Runtime recovered; rerun VMx before continuing`：发生 recoverable warning，当前 VM 必须重新 preview；
- `Runtime unstable; reset Unity before next preview`：连续 runtime warning 或页面无响应风险较高，要求用户 reset/reload；
- `Reloading Unity runtime`：前端正在重新创建 Unity runtime；
- `Preview invalidated: rerun this VM`：当前 preview session 已失效。

### 4.2 内部状态

内部可保持轻量字段，不需要引入复杂状态机库：

```json
{
  "status": "idle | busy | settling | ready_for_next_preview | recovered_requires_rerun | invalidated | runtime_unstable | reloading",
  "active_preview_session_id": "vis-...",
  "active_virtual_node_id": "virtual-machining-3",
  "last_completed_session_id": "vis-...",
  "requires_rerun_node_id": "virtual-machining-3",
  "runtime_warning_count": 0,
  "safe_to_preview": true,
  "ready_reason": "completed_event_received_and_settled",
  "block_reason": null,
  "updated_at": "..."
}
```

重点不是字段数量，而是明确 `safe_to_preview` 不能只由 `recovery_remaining_ms <= 0` 得出。

## 5. 状态触发规则

### 5.1 Preview 开始

触发：用户点击某 VM 的 `Preview Cutting`。

动作：

```text
create preview_session
status = busy
safe_to_preview = false
event_log += unity_preview_requested
event_log += preview_session_created
```

UI：

```text
Unity Preview Status: Preview running: VMx
```

### 5.2 命令边界记录

每条 Unity 命令前后都记录轻量事件，便于定位问题发生在哪一层：

```text
unity_command_started
unity_command_completed
unity_command_failed
```

payload 至少包含：

```json
{
  "preview_session_id": "vis-...",
  "virtual_node_id": "virtual-machining-3",
  "command": "resetScene | importTriDexelImage | loadScene | clearErrorCloud | refreshErrorCloud | startMachiningJob",
  "sequence_index": 1,
  "geometry_artifact_id": "geo-...",
  "node_result_version_id": "nrv-...",
  "timestamp": "..."
}
```

说明：这不是引入复杂系统，而是给现有 event log 加上命令边界，解决“到底哪一步坏了”的可观测性问题。

### 5.3 Unity completed event 到达

触发：收到 `UnityMachiningCompleted` 或等价 completed event。

动作：

```text
status = settling
event_log += unity_completed_event_received
start settle window
```

UI：

```text
Unity Preview Status: Waiting for Unity preview to settle
```

说明：completed event 不应立刻等同于 ready。它只说明 Unity 报告加工完成，还需要确认该 session 没有 warning、artifact capture 已正确归属、前端不再 pending。

### 5.4 settle 完成

最小 ready 条件：

```text
当前 session 未 invalidated
当前 session_id 与 completed event 对应
没有新的 recoverable runtime warning
没有 pendingGeometryCaptureSessionId 残留
如果本次需要 triDexel artifact，则 artifact 已捕获或明确标记 skipped
Unity widget runtime 不在 loading/recovering
```

全部满足：

```text
status = ready_for_next_preview
safe_to_preview = true
event_log += preview_ready_for_next
```

UI：

```text
Unity Preview Status: Ready for next preview
```

不满足：

```text
status = invalidated 或 runtime_unstable
safe_to_preview = false
event_log += preview_settle_failed
```

### 5.5 recoverable runtime warning

触发：捕获以下错误之一：

```text
null function
table index is out of bounds
memory access out of bounds
PlayerLoop internal function has been called recursively
called recursively
```

动作：

```text
current preview_session.status = invalidated
safe_to_preview = false
requires_rerun_node_id = current VM
runtime_warning_count += 1
event_log += preview_session_invalidated
event_log += unity_runtime_warning_captured
```

如果 `runtime_warning_count` 在一个页面生命周期内达到阈值，例如 2 次：

```text
status = runtime_unstable
block_reason = repeated_runtime_warning
```

UI：

```text
Unity Preview Status: Runtime unstable; reset Unity before next preview
```

如果是第一次 warning：

```text
Unity Preview Status: Runtime recovered; rerun VMx before continuing
```

说明：第一次 warning 后允许用户 rerun 当前 VM；连续 warning 后不再自动宣称 ready，避免继续把已损坏的 WebGL runtime 用到无响应。

## 6. 运行逻辑

### 6.1 下一轮 preview 前检查

点击 VM preview 前，先检查：

```text
1. 是否已有 preview 正在运行；
2. Unity runtime 是否 runtime_unstable；
3. 当前 VM 是否就是 requires_rerun_node_id；
4. 如果 requires_rerun_node_id 存在但用户点击了其它 VM，应阻止；
5. upstream geometry artifact 是否 fresh；
6. 该 VM 的 wall-error result 是否 fresh；
7. 如果 selected VM 是 imported/upstream geometry，是否存在可 preview 的 triDexelImageBase64 artifact。
```

建议规则：

- 当前 session invalidated 后，只允许 rerun 当前 VM 或 reset/reload Unity；
- 不允许在 VM3 invalidated 后直接 preview VM4；
- 连续 warning 后要求 reset/reload，不继续自动 preview；
- reset/reload 后清空 `requires_rerun_node_id` 与 warning count。

### 6.2 preview 命令序列

下一轮 build 仍可沿用当前命令顺序，但需要在每一步加入事件记录与失败断点：

```text
create session
-> command resetScene started/completed
-> command importTriDexelImage or loadScene started/completed
-> command clearErrorCloud started/completed
-> command refreshErrorCloud started/completed
-> command startMachiningJob started/completed
-> wait Unity completed event
-> settle
-> ready or invalidated
```

如果任何一步失败：

```text
session.status = failed 或 invalidated
status = recovered_requires_rerun 或 runtime_unstable
不捕获 fresh artifact
不进入下一个 VM
```

## 7. 如何区分两类根因

当前有两个候选根因：

A. 上一次 preview 没有完全结束，本次 preview 太早进入；
B. 本次 preview 的某个环节本身不稳定，例如 tri-dexel import、error cloud、machining job。

下一轮系统调试应通过以下实验区分。

### 7.1 实验 A：干净 Unity runtime 下单独运行 VM3

步骤：

```text
刷新页面或 reset/reload Unity runtime
导入同一 snapshot
只点击 VM3 preview
```

判断：

- 如果 VM3 单独稳定成功，说明 VM3 payload / artifact 本身大概率正确，问题偏向上一轮 preview 残留状态；
- 如果 VM3 单独稳定失败，说明 VM3 的 artifact、payload、toolpath、error cloud 或 Unity 处理逻辑本身有问题。

### 7.2 实验 B：每个 VM preview 前强制 reload Unity

步骤：

```text
VM1 preview
reload Unity
VM2 preview
reload Unity
VM3 preview
reload Unity
VM4 preview
```

判断：

- 如果该实验稳定成功，说明问题主要来自 runtime 残留或命令重入；
- 如果仍失败，说明某个 VM 自身 preview 输入或 Unity 内部处理有问题。

### 7.3 实验 C：禁用 automatic next preview，要求当前 VM rerun 后才能继续

步骤：

```text
VM1 preview
VM2 preview
VM3 preview 出现 warning
不要继续 VM4
重新 VM3 preview
VM3 成功后再 VM4
```

判断：

- 如果 rerun VM3 后 VM4 稳定，说明 invalidation 后当前 VM 必须重新获得 fresh preview session；
- 如果 VM3 rerun 仍失败，不能再推断是上一轮残留，需查 VM3 输入。

### 7.4 实验 D：命令边界定位

通过 event log 查看最后一条成功命令：

```text
resetScene completed?
importTriDexelImage completed?
clearErrorCloud completed?
refreshErrorCloud completed?
startMachiningJob sent?
Unity completed event received?
settle completed?
```

判断：

- 如果失败发生在 `importTriDexelImage` 后，重点查 artifact 和 Unity scene import；
- 如果失败发生在 `refreshErrorCloud` 后，重点查 error cloud 替换和坐标；
- 如果失败发生在 `StartMachiningJob` 后，重点查 Unity machining job 内部状态和 PlayerLoop；
- 如果 completed event 后才无响应，重点查 artifact capture / event handler / post-completion settle。

## 8. 下次 build 的最小任务拆分

### R1. 收紧 ready 语义

修改目标：

- 不再用 `recovery_remaining_ms <= 0` 直接表示 ready；
- completed event 后先进入 `settling`；
- 只有满足最小 ready 条件后才显示 `Ready for next preview`。

验收：

- VM preview 完成后能看到短暂 `Waiting for Unity preview to settle`；
- settle 成功后才显示 `Ready for next preview`；
- runtime warning 后不会自动回到 ready。

### R2. 增加命令边界事件

修改目标：

- 在 reset / import / clear cloud / refresh cloud / start machining / completed / settle 边界记录 event。

验收：

- event log 能看到每次 preview 的完整命令链；
- 能判断 VM3 失败发生在哪一步。

### R3. runtime warning 后限制下一步动作

修改目标：

- 当前 VM invalidated 后，仅允许 rerun 当前 VM 或 reset/reload；
- 不允许直接继续其它 VM；
- 连续 warning 后进入 `runtime_unstable`，要求 reset/reload。

验收：

- VM3 invalidated 后点击 VM4 会被阻止；
- rerun VM3 或 reset/reload 后才允许继续；
- 连续 warning 后 canvas 给出明确提示。

### R4. 增加人工调试视图或 Console helper

修改目标：

提供一个轻量 Console helper 或 snapshot 字段，输出：

```text
preview_session_id
virtual_node_id
status
last_command
geometry_artifact_id
source_node_id
result_version_id
runtime_warning
ready_reason
block_reason
```

验收：

- 用户可以快速判断当前 VM 是 ready、invalidated 还是 runtime_unstable；
- 能对照 VM1/VM2/VM3/VM4 的 preview session。

## 9. 推荐 Console 审查命令

下一轮 build 后建议保留或新增类似输出：

```js
(() => {
  const s = window.workflowRuntimeState ?? {}
  return {
    preview_runtime_status: s.preview_runtime_status,
    sessions: (s.visualization_sessions ?? []).map(v => ({
      session: v.visualization_session_id,
      node: v.virtual_node_id,
      status: v.status,
      artifact: v.geometry_artifact_id ?? v.scene_payload?.geometry_artifact_id ?? null,
      result: v.node_result_version_id,
      warning: v.runtime_warning ?? null,
      scene_t: v.scene_payload?.workpiece?.thickness,
      unity_t: v.unity_payload?.workpiece?.thickness,
      first_errors: (v.unity_payload?.points ?? []).slice(0, 3).map(p => p.error),
    })),
    last_events: (s.event_log ?? []).slice(-20).map(e => ({
      seq: e.event_sequence,
      type: e.event_type,
      node: e.node_id,
      summary: e.summary,
      command: e.payload?.command,
      session: e.payload?.preview_session_id ?? e.payload?.visualization_session_id,
      reason: e.payload?.block_reason ?? e.payload?.runtime_warning ?? e.payload?.error,
    })),
  }
})()
```

该审查命令的目标不是替代 UI，而是帮助定位下一轮 build 是否真正记录了足够事件。

## 10. 当前非目标

本方案不做：

- 不修改 Unity Build；
- 不修改 `/prediction/wall-error`；
- 不重新定义 GeometryArtifact；
- 不引入后端 preview orchestration service；
- 不实现完整 Unity 双向协议；
- 不让所有 workflow 运行都依赖 Unity preview。

## 11. 何时需要 Unity 侧配合

如果 R1-R4 后仍无法稳定，则说明前端启发式等待已经到边界，需要 Unity 侧提供最小回调。

推荐最小回调，不要求一次全部实现：

```text
OnSceneResetCompleted(sessionId)
OnTriDexelImported(sessionId)
OnErrorCloudApplied(sessionId)
OnMachiningCompleted(sessionId, triDexelImageBase64)
OnPreviewRuntimeIdle(sessionId)
OnUnityRuntimeInvalidated(sessionId, reason)
```

其中最关键的是 `OnPreviewRuntimeIdle(sessionId)`。只有它能把 `Ready for next preview` 从前端猜测升级为 Unity 明确承诺。

在没有该回调前，前端只能使用“completed event + settle window + no warning + no pending session”的保守判据，不能再把固定恢复时间结束直接当作稳定完成。
## 12. 2026-07-01 v19 build 记录

本轮 build 针对人工测试中出现的 `Uncaught RuntimeError: function signature mismatch` 做最小 runtime 稳定性增强。

已实现：

- 将 `function signature mismatch` 纳入 recoverable Unity runtime error，与 `null function`、`table index is out of bounds`、`memory access out of bounds`、PlayerLoop recursion 同类处理。
- Unity widget 记录页面生命周期内的 recoverable runtime warning 次数。
- 连续 recoverable warning 达到阈值后，widget 暴露：

```json
{
  "runtime_unstable": true,
  "safe_to_preview": false,
  "block_reason": "repeated_runtime_warning"
}
```

- workflow preview 入口检测到 `runtime_unstable` 后，不再继续发送 `resetScene -> import/load -> cloud -> StartMachiningJob` 命令序列。
- canvas / Unity 状态提示显示：

```text
Unity Preview Status: Runtime unstable; reset Unity before next preview
```

- 用户手动执行 Reset Scene 后，前端清除 runtime warning 计数并恢复 preview 门禁。

本轮未实现：

- 未实现完整 command boundary event；
- 未实现 `Waiting for Unity preview to settle`；
- 未实现 Unity 侧 `OnPreviewRuntimeIdle(sessionId)`；
- 未改变 Unity Build 或 wall-error prediction。

因此 v19 是 R1/R3 的第一步：先避免未识别 runtime error 直接穿透，以及避免重复 warning 后继续向不健康 Unity runtime 发送 preview 命令。
## 13. 2026-07-08 控件化 build 记录

本轮 build 将 Unity preview 从单一 `Preview Cutting` 操作拆成右侧 Unity Machining Scene 面板外部的显式控件组，目标是让用户能够按阶段确认当前 VM 的场景、误差云图与切削运行时状态。

新增控件：

- `Prepare Scene`：加载当前选中 VM 的输入几何。参数化几何走场景加载；tri-dexel / upstream VM 几何先执行 `ImportTriDexelImage(base64)`。随后清空旧云图并应用当前 VM 的设计面误差云图。
- `Apply Error Cloud`：在已准备好的当前 VM 场景上，重新清空并发送当前 VM 的 `design_surface_error` 点集；不启动切削。
- `Start Cutting`：在已准备好且已绑定当前 VM 云图的场景上执行 `StartMachiningJob(payload)`，完成后捕获当前 VM 的 tri-dexel artifact。
- `Reload Runtime`：销毁/放弃当前 Unity WebGL runtime 实例，清理 runtime warning 计数并重新加载 Unity。用于连续出现 `null function`、`table index is out of bounds`、`memory access out of bounds`、`function signature mismatch` 等 recoverable runtime warning 后的人工恢复。
- `Reset Scene`：仍保留为场景级重置；它不是完整 runtime reload。

当前语义确认：

```text
Input scene thickness = current_thickness_reference
Error cloud surface = design_surface_thickness
Cutting preview removes material from current_thickness_reference to design_surface_thickness
```

例如当前 VM 输入实体厚度为 3mm、`design_surface_thickness = 2mm` 时：

- `Prepare Scene` 应加载 3mm 输入实体；
- `Apply Error Cloud` 应把当前 VM 的 `design_surface_error` 显示到 2mm 设计面；
- `Start Cutting` 表达 3mm -> 2mm 的材料去除过程；
- 最终捕获的 tri-dexel artifact 归属当前 VM preview session。

旧的 Inspector 中 `Preview Cutting` 入口仍保留，但现在内部委托为：

```text
Preview Cutting = Prepare Scene -> Start Cutting
```

按钮可用性：

- 未选中 VM 或当前 VM 尚无 wall-error prediction 结果时，`Prepare Scene`、`Apply Error Cloud`、`Start Cutting` 禁用。
- 场景未准备完成时，`Apply Error Cloud` 与 `Start Cutting` 禁用。
- preview 命令执行中，场景修改类按钮禁用。
- runtime unstable 时，禁止继续 preview；用户应使用 `Reload Runtime` 或 `Reset Scene`。

本轮未修改：

- Unity Build；
- `/prediction/wall-error`；
- tri-dexel 数据结构；
- wall-error 预测计算；
- geometry artifact 数学语义。
## 14. 2026-07-09 控件状态修复记录

人工测试发现：`Prepare Scene` 点击后看起来没有反应，且 `Apply Error Cloud` / `Start Cutting` 仍保持不可点击。根因不是 Unity Build，也不是 prediction 结果缺失，而是 workflow 前端的 UI 状态刷新顺序错误。

问题原因：

```text
Prepare Scene 成功
-> publishWorkflowRuntimeState()
-> renderGraph()
-> finally 才执行 state.virtualPreviewInFlight = false
```

因此右侧控件在渲染时仍被判断为 `busy`，导致 `Apply Error Cloud` 与 `Start Cutting` 保持 disabled。用户只能继续通过 Inspector 内部旧的 `Preview Cutting` 入口触发完整流程。

修复方式：

- `Prepare Scene`、`Apply Error Cloud`、`Start Cutting` 三个显式控制流程均在 `finally` 中清理 `state.virtualPreviewInFlight` 后再次 `publishWorkflowRuntimeState()` 与 `renderGraph()`。
- 新增回归测试：`Prepare Scene clears preview in-flight before refreshing dock controls`，防止后续再次出现控件卡在 busy 状态的问题。

验收语义：

```text
Prepare Scene 完成后：
- 当前 VM 的 virtualSceneReady = true
- state.virtualPreviewInFlight = false
- Apply Error Cloud 可点击
- Start Cutting 可点击
```

本次仍未修改 Unity Build、wall-error prediction、tri-dexel artifact 数据结构或后端算法。
## 15. 2026-07-09 右侧 Unity dock 按钮绑定修复

人工测试继续发现：右侧 `Prepare Scene` 点击后没有可见交互，`Apply Error Cloud` 与 `Start Cutting` 仍然不可点击；但 Inspector 内的 `Preview Cutting` 可以很快触发。

根因确认：

```text
Inspector Preview Cutting 有 data-action 绑定
右侧 Unity dock 的 Prepare Scene / Apply Error Cloud / Start Cutting / Reload Runtime 按钮没有绑定 click handler
```

因此这不是 Unity runtime、tri-dexel artifact 或 prediction 计算问题，而是右侧 dock 控件没有进入对应前端函数。

修复方式：

- 在 `bindEvents()` 中显式绑定：
  - `prepareVirtualScene -> prepareSelectedVirtualMachiningScene()`
  - `applyVirtualErrorCloud -> applyCurrentVirtualMachiningErrorCloud()`
  - `startVirtualCutting -> startSelectedVirtualCutting()`
  - `reloadVirtualRuntime -> reloadVirtualMachiningRuntime()`
- 新增回归测试：`Unity dock buttons are wired to explicit preview control handlers`。

预期交互：

```text
选择已有 wall-error prediction 结果的 VM
-> Prepare Scene 可点击并显示准备状态
-> 准备完成后 Apply Error Cloud / Start Cutting 可点击
-> Inspector 的 Preview Cutting 仍保留为 Prepare Scene -> Start Cutting 的快捷入口
```

未修改：Unity Build、后端预测、geometry artifact 数据结构、wall-error 计算逻辑。