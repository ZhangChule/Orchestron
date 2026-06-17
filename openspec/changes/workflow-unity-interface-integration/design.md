# 设计：Unity 接口集成与分阶段合并

## 核心判断

新版 Unity 应被接入为 workflow 的 visualization consumer，而不是 workflow execution core 的一部分。当前 workflow 的计算链路仍以 Virtual Machining wall-error prediction、WTC、parameter-update、WorkflowState、NodeResultVersion 为核心。

Unity 集成层应只消费某个 Virtual Machining 节点的结果和可视化 payload：

```text
Workflow execution
-> Virtual Machining prediction result
-> NodeResultVersion
-> Unity preview payload mapper
-> Unity preview session
-> Unity Build
```

## 当前边界

### 保持不变

- `/prediction/wall-error` 仍是壁厚误差预测执行主体。
- WorkflowState / ParameterPatch / NodeResultVersion 仍是 workflow 数据流事实来源。
- 当前 closed-loop demo 的执行语义不因 Unity 接入被重写。
- Unity Build 不参与 condition / stop / parameter-update 的业务决策。

### 可以变化

- workflow 侧构造 Unity payload 的方式；
- Unity preview 的 session 记录方式；
- workflow 自动执行与用户手动 preview 的触发边界；
- 静态 Unity Build 资源位置或加载入口，前提是保持用户可运行。

## 分层方案

### 1. Unity Build 层

职责：

- 提供新版 Unity WebGL 产物；
- 根据新版说明文件消费 payload；
- 展示走刀级或工步级虚拟加工过程。

约束：

- 不在本 change 中修改 Unity Build 内部实现；
- 如果远端分支已包含 Unity Build 产物，优先按远端产物接入；
- 若 Unity Build 与当前静态资源路径冲突，需要在 workflow 侧加载逻辑中处理。

### 2. Unity Interface Spec 层

职责：

- 记录新版 Unity 支持的输入协议；
- 区分旧版兼容字段与新版工步级字段；
- 提供示例 payload / 运行数据。

约束：

- 说明文件是 adapter 的依据；
- 说明文件不等同于 workflow 全局 contract；
- 不把 geometry / voxel / tri-dexel 问题提前固化。

### 3. Workflow Unity Adapter 层

职责：

- 从 workflow 当前节点、WorkflowState、NodeResultVersion 中生成 Unity payload；
- 兼容旧版 scene payload；
- 支持新版工步级 payload；
- 记录 preview session 与来源节点的关系。

建议最小输出：

```json
{
  "preview_session_id": "...",
  "source_node_id": "...",
  "node_result_version_id": "...",
  "payload_schema_version": "...",
  "preview_level": "toolpath | operation",
  "payload": {}
}
```

### 4. Workflow UI 层

职责：

- 明确哪个 Virtual Machining 节点正在被 preview；
- 明确某个 Unity preview 来自哪个 NodeResultVersion；
- 区分 workflow 自动运行和用户手动 preview。

本 change 可以做最小 UI 接入，但不重做整体 UI/UX。

## 合并前风险清单

| 风险 | 影响 | 当前处理 |
| --- | --- | --- |
| Unity 新接口字段与当前 payload 不一致 | preview 失败或展示错误 | 先抽取说明文件，再写 adapter |
| 远端分支同时包含业务代码和接口文档 | 直接 merge 风险高 | 先按文件类别审查 |
| 新版支持工步级，当前 workflow 仍是节点级 | 粒度不一致 | 在 adapter 中表达 preview_level，不改 execution core |
| 多个 Virtual Machining 节点共享一个 Unity viewer | preview 来源不清 | 引入 preview session 记录 |
| 自动 workflow run 触发 Unity preview | 计算和展示耦合 | 后续明确自动运行与手动 preview 边界 |
| 运行数据涉及 geometry / voxel / tri-dexel | 诱导过早 schema 化 | 只记录风险，不实现 geometry contract |
| 旧 snapshot 中 preview payload 可能失效 | 历史回放不一致 | snapshot 中记录 payload_schema_version |
| 静态资源路径变化 | Docker / 前端加载失败 | 合并时单独验证加载路径 |

## 分阶段合并设计

### 阶段 A：远端差异审查

输入：

- 用户下一次提供的远端地址、分支名或 PR。

输出：

- 文件差异分类；
- 合并候选清单；
- 暂缓合并清单；
- 风险清单更新。

### 阶段 B：接口说明与运行数据接收

目标：

- 优先读取远端说明文件；
- 提取新版 Unity payload 必需字段、可选字段、兼容字段；
- 标记走刀级与工步级差异。

不做：

- 不实现 geometry contract；
- 不推断说明文件没有写明的字段语义。

### 阶段 C：Unity Build 接入

目标：

- 合并或替换 Unity Build 静态资源；
- 保持旧入口可用；
- 验证 Unity 能加载。

不做：

- 不修改 Unity 内部代码；
- 不把 Unity 作为业务计算节点。

### 阶段 D：Workflow Adapter 修改

目标：

- 修改 workflow 侧 Unity payload mapper；
- 兼容旧 payload；
- 支持新版工步级 payload；
- 绑定 `source_node_id` 和 `node_result_version_id`。

### 阶段 E：验证

最低验证：

- closed-loop demo 仍能运行；
- `/prediction/wall-error` 请求与响应不变；
- 多个 Virtual Machining 节点能分别生成 preview payload；
- 用户手动选择某个 Virtual Machining 节点 preview 时，Unity 显示对应 session；
- 新版 Unity Build 可加载；
- 未实现 geometry contract。

## 后续独立 change

合并完成后，voxel / tri-dexel / geometry 数据问题应进入独立 change，例如：

```text
workflow-geometry-artifact-contract-v0
```

该后续 change 才讨论 STL、voxel、tri-dexel、Unity 几何输入、计算格式和归档格式之间的边界。
