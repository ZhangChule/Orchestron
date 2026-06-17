# Unity Preview Session 设计补充

## 背景

当前 workflow 中的 virtual machining 节点同时承担了三件事：

1. 调用 `/prediction/wall-error` 完成壁厚误差预测；
2. 构造 Unity payload；
3. 触发或刷新 Unity preview。

这导致 Unity 更像一个全局 visualization consumer，而不是每个 virtual machining node 各自拥有清晰的 visualization session。多个虚拟加工节点连续执行时，用户难以判断：

- 当前 Unity preview 来自哪个 VC 节点；
- 当前 preview 对应哪一次 `NodeResultVersion`；
- 某个 payload 是自动运行产生的，还是用户手动预览产生的；
- workflow 自动运行是否应该启动切削流程预览。

## 目标

后续应把 virtual machining 的计算、可视化输入和可视化展示拆开：

- wall-error prediction 是计算执行；
- Unity payload 是可视化输入 artifact；
- Unity preview 是展示行为；
- workflow 自动运行和用户手动 preview 必须明确区分。

本设计文档只记录 UI/UX 与运行语义方案，不在当前修复中修改 Unity Build。

## 建议模型

### 1. VisualizationSession

为每次可视化建立最小 session 记录：

```json
{
  "visualization_session_id": "...",
  "virtual_node_id": "...",
  "node_result_version_id": "...",
  "parameter_base_version_id": "...",
  "unity_payload_ref": "...",
  "created_by": "manual_preview | workflow_auto_run",
  "status": "ready | previewing | failed",
  "created_at": "..."
}
```

其中：

- `virtual_node_id` 说明该 preview 属于哪个 VC；
- `node_result_version_id` 说明该 preview 对应哪一次预测结果；
- `parameter_base_version_id` 说明该 preview 使用哪一版工艺参数 base；
- `created_by` 区分用户手动 preview 与 workflow 自动运行。

### 2. 自动运行与手动 preview 分离

建议规则：

- `Run All` / `Run From Selected` 默认只执行 wall-error prediction，不自动启动 Unity 切削流程；
- 每个 VC 执行完成后生成可预览的 Unity payload；
- 用户点击某个 VC 的 `Preview` 时，才把该节点当前 active `VisualizationSession` 发送给 Unity；
- 如果确实需要自动 preview，应提供显式开关，例如 `Auto preview selected VC only`，默认关闭。

### 3. 工作流画布中的可见标识

每个节点应显示稳定的 workflow 编号，例如：

- `#1 VM`
- `#2 Condition`
- `#3 WTC`
- `#4 Parameter Update`

编号只用于 UI 对照，不替代内部 `node_id`。事件日志可以同时显示：

```text
#4 Parameter Update / parameter-update-6 / patch-created / patch-...
#5 VM / virtual-machining-2 / base-created / base-...
```

### 4. 当前 preview 绑定提示

画布中应突出当前 Unity preview 所属的 VC 节点：

- 当前被 Unity 展示的 VC 节点高亮；
- 节点卡片显示 `Previewing result-version-...`；
- Unity 面板标题显示 `Preview: #5 VM / virtual-machining-2 / result-version-...`；
- 如果用户选择另一个 VC，但 Unity 面板仍显示旧 session，应显示 `preview differs from selected node`。

### 5. Event Log 简化对照

事件日志应避免只显示长 ID。建议每条关键事件显示：

- workflow 编号；
- node label；
- event type；
- base version 简写；
- result version 简写；
- patch 简写；
- 关键参数摘要，例如 `radial_depth: 1.0 -> 0.9018`。

示例：

```text
#5 VM base-created base-2 radial_depth=0.9018 patches=[patch-6]
#8 VM base-created base-4 radial_depth=0.9089 patches=[patch-16]
#8 VM preview-ready result-version-4 manual=false
```

## 分阶段建议

### UI/UX Change 统一处理

该问题不仅涉及 Unity，也涉及 workflow 画布、节点编号、事件日志可读性、结果面板和手动调试入口。建议后续单独创建一个 UI/UX change，例如：

`workflow-visualization-session-and-eventlog-ux-v0`

该 change 可包含：

- 节点显示编号；
- 当前 selected / executed / previewing 节点状态；
- Unity preview session 记录；
- 手动 Preview 按钮与自动运行分离；
- event log 简化视图；
- result/base/patch 的可点击或可展开对照。

### 当前 change 的边界

当前 `workflow-dataflow-alignment-build-v0` 只解决 workflow/dataflow 一致性问题，不重构 Unity Build，不改变 `/prediction/wall-error`，不引入完整 Artifact 系统。

