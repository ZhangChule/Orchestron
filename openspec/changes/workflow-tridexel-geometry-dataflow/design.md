# 设计说明

## 1. Source of Truth

本 change 是 tri-dexel 几何数据流阶段的当前设计来源。历史 change 中如存在以下旧判断，均以本设计覆盖：

- tri-dexel 只是临时 preview 状态；
- 计算侧与可视化侧长期分离；
- 当前方案只是过渡方案；
- 每个 VM 节点即使读取上游几何，也必须保留自己的理想参数化几何作为真正执行 base；
- `Design radial depth` / `Execution radial depth` 可以作为 VM Inspector 的核心标量字段。

## 2. 当前事实

Unity Build 已确认支持：

```text
ImportTriDexelImage(base64)
  -> 恢复 Unity 场景实体

StartMachiningJob(payload)
  -> 在当前 Unity 场景实体上执行当前节点加工可视化

UnityMachiningCompleted
  -> 返回 triDexelImageBase64
```

因此，workflow 需要把 `triDexelImageBase64` 作为几何状态传递载体纳入数据流，而不是仅作为 Unity widget 局部状态。

当前仍需要明确的缺口是：

- workflow 如何保存、命名、引用、snapshot 和 stale 管理 tri-dexel 几何状态；
- 下游 VM 如何显式选择上游 VM 作为几何输入；
- 后端预测所需 `current_thickness_field` 如何从 tri-dexel artifact 派生；
- VM Inspector 如何避免继续显示误导性的标量 radial depth。

## 3. 核心概念

### 3.1 GeometryArtifact

最小字段：

```json
{
  "artifact_id": "geo-...",
  "artifact_type": "tridexel_image",
  "format": "unity-tridexel-image-base64",
  "schema_version": "geometry-artifact.v0",
  "source_node_id": "virtual-1",
  "source_node_label": "Virtual Machining 1",
  "source_result_version_id": "nrv-...",
  "source_visualization_session_id": "vis-...",
  "run_id": "run-...",
  "data_base64": "...",
  "data_ref": null,
  "geometry_metadata": {
    "coordinate_space": "workpieceLocalMm",
    "workpiece": {
      "length": 120,
      "height": 55,
      "thickness": 6,
      "base_width": 120,
      "base_height": 15
    }
  },
  "derived_fields": {
    "current_thickness_field": null
  },
  "summary": {
    "base64_length": 0,
    "byte_length": 0
  },
  "stale": false,
  "stale_reason": null,
  "created_at": "..."
}
```

当前阶段允许 snapshot 内联保存 `data_base64`。如果体积过大，后续单独引入 `data_ref` / artifact store。

字段分工：

- `data_base64`：用于 Unity `ImportTriDexelImage(base64)`，恢复可视化场景实体；prediction-only artifact 可为空；
- `derived_fields.current_thickness_field`：用于 workflow / prediction 数据流，表达下游 VM 计算所需的当前实际壁厚场；
- 不应假设 `data_base64` 一定可被 workflow 前端直接解析为厚度场。若 Unity 返回的是不透明 tri-dexel 二进制，应由上游 VM 的预测后处理结果补充 `derived_fields.current_thickness_field`。

非冗余导出约束：
- `geometry_metadata` 只保存下游 `StartMachiningJob(payload)` 需要的最小几何 envelope，不保存完整 `scene_payload` 或 `unity_payload`。
- 当 VM-B 读取 VM-A 导出的 tri-dexel artifact 时，Unity preview 的 `payload.workpiece` 必须来自 `artifact.geometry_metadata.workpiece`，而不是 VM-B parametric 表单里隐藏的默认尺寸。
- 旧版导出的 artifact 如果缺少 `geometry_metadata`，不能可靠复用到下游 preview，应重新从上游 VM 导出。

### 3.2 WorkflowState 扩展

最小扩展：

```json
{
  "geometry_artifacts": [],
  "active_geometry_artifact_refs": {}
}
```

含义：

- `geometry_artifacts`：所有已捕获的 tri-dexel 几何状态历史；
- `active_geometry_artifact_refs`：每个 VM 节点当前采用的几何输入 artifact 引用；
- 旧 snapshot 导入时，如果缺少这些字段，应补为空数组/对象。

### 3.3 VM 工件几何输入来源

建议在 VM 节点 config 中加入：

```json
{
  "workpiece_source": {
    "mode": "parametric | file | upstream_node",
    "upstream_virtual_node_id": null,
    "geometry_artifact_id": null,
    "file_name": null
  }
}
```

规则：

- `parametric`：使用当前参数化尺寸对象定义初始工件，兼容旧行为；
- `file`：保留边界，本 change 不强行实现完整文件几何读取；
- `upstream_node`：读取指定上游 VM 节点最新 fresh geometry artifact。该 artifact 可能是 prediction-only `current_thickness_field`，也可能是可供 Unity preview 的 `tridexel_image`。

当 `mode = upstream_node` 时，上游 geometry artifact 才是当前执行几何输入；本节点参数化尺寸只可作为默认、坐标辅助或 fallback，不应覆盖上游几何状态。

## 4. 厚度语义

VM 节点应使用如下语义：

```text
design_surface_thickness
  = 设计加工面的壁厚，标量，由 VM config 交互定义，属于工艺参数 base

execution_surface_thickness
  = 执行加工面的壁厚，标量，由补偿/参数 patch 在运行时确定

current_thickness_field[key_point]
  = 当前实际壁厚场，来自参数化初始工件或上游 tri-dexel artifact 派生

execution_radial_depth_field[key_point]
  = current_thickness_field[key_point] - execution_surface_thickness
```

因此：

- `execution_radial_depth_field` 是场/矩阵，不是一个标量；
- VM Inspector 不应继续把 `Design radial depth` 和 `Execution radial depth` 作为主要字段；
- Inspector 应显示 surface thickness 标量与 thickness field 摘要。

建议 Inspector 显示：

| 字段 | 类型 | 来源 |
| --- | --- | --- |
| `design_surface_thickness` | 标量 | 用户在 VM config 中定义，属于工艺参数 base |
| `execution_surface_thickness` | 标量 | workflow 运行时由补偿/参数 patch 得到 |
| `current_thickness_field` | 场/矩阵摘要 | 参数化初始工件或上游 tri-dexel artifact 派生 |
| `execution_radial_depth_field` | 场/矩阵摘要 | `current_thickness_field - execution_surface_thickness` |

字段摘要至少包含 source、count、min、max、mean；如果是矩阵，还应包含维度或采样说明。

## 5. 执行数据流

### 5.1 上游 VM 生成几何 artifact

```text
VM-A run
  -> /prediction/wall-error
  -> postprocess computed_actual_thickness
  -> create GeometryArtifact
       artifact_type = current_thickness_field
       data_base64 = null
       derived_fields.current_thickness_field = VM-A prediction postprocess computed_actual_thickness field
  -> WorkflowState.geometry_artifacts += artifact
  -> event_log += current_thickness_field_artifact_created

VM-A preview/export
  -> StartMachiningJob(payload)
  -> UnityMachiningCompleted({ triDexelImageBase64 })
  -> create GeometryArtifact
       artifact_type = tridexel_image
       data_base64 = triDexelImageBase64
       derived_fields.current_thickness_field = VM-A prediction postprocess computed_actual_thickness field
  -> WorkflowState.geometry_artifacts += artifact
  -> event_log += geometry_artifact_created
```

artifact 必须绑定：

- `source_node_id`
- `source_result_version_id`
- `source_visualization_session_id`，仅 tri-dexel image artifact 必须绑定；prediction-only current thickness artifact 可以为空；
- `run_id`
- `derived_fields.current_thickness_field`，当 VM-A 已完成 prediction postprocess 且存在 `computed_actual_thickness` 时必须记录。

### 5.2 下游 VM 读取上游几何

```text
VM-B workpiece_source.mode = upstream_node
VM-B workpiece_source.upstream_virtual_node_id = VM-A

VM-B execute:
  -> resolve latest fresh GeometryArtifact from VM-A
  -> use artifact.geometry_metadata.workpiece as prediction workpiece envelope
  -> deriveCurrentThicknessFieldFromTriDexelArtifact(artifact, sampling_config)
  -> current_thickness_field
  -> execution_surface_thickness
  -> execution_radial_depth_field
  -> /prediction/wall-error

VM-B preview:
  -> ImportTriDexelImage(artifact.data_base64)
  -> StartMachiningJob(VM-B payload)
```

Prediction 必须引用带有 `derived_fields.current_thickness_field` 的 fresh artifact。Preview 必须引用带有 `data_base64` 的 fresh tri-dexel image artifact。若 prediction 使用 prediction-only artifact，则允许完成计算，但 preview 应提示用户先对上游 VM 执行 Preview Cutting / Export TriDexel 生成可导入 Unity 的实体 artifact。

当 artifact 场景下生成 Unity `points` 时，坐标变换必须优先使用每个点的 `execution_radial_depth`：

```text
Unity x = backend y - point.execution_radial_depth
Unity y = backend z
Unity z = -backend x
```

只有旧数据缺少 per-point 切深时，才回退到 `process.radialDepth`。否则在非参数化几何来源中，误差点可能偏离已导入的 tri-dexel 场景实体，导致切削可见但误差颜色映射不可见。

### 5.3 tri-dexel 到 current_thickness_field

需要定义函数边界：

```text
deriveCurrentThicknessFieldFromTriDexelArtifact(artifact, options)
```

输入：

- `artifact.data_base64`
- `artifact.derived_fields.current_thickness_field`
- 当前 VM 的关键点定义或采样配置；
- 坐标系/几何尺寸辅助信息；
- 可选的 Unity 协议解析结果。

输出：

```json
{
  "field_type": "current_thickness_field",
  "source_artifact_id": "geo-...",
  "values": [],
  "point_refs": [],
  "summary": {
    "count": 0,
    "min": null,
    "max": null,
    "mean": null
  }
}
```

如果当前无法从 base64 中解析/派生该字段，必须显式失败：

```text
tri_dexel_thickness_parser_missing
```

失败时不允许静默退回参数化厚度并继续下游 prediction，因为这会破坏 workflow 与 dataflow 的一致性。

当前实现优先级：

1. 优先读取 `artifact.derived_fields.current_thickness_field`；
2. 其次尝试读取可解析 JSON base64 中的 `current_thickness_field` / `thickness_field`；
3. 若二者都不存在，返回 `tri_dexel_thickness_parser_missing`。

这意味着 `ImportTriDexelImage(base64)` 能恢复 Unity 场景实体，并不等价于 workflow 能从 base64 反解析出计算壁厚场。为保持 Unity Build 解耦，当前阶段不反向解析 Unity tri-dexel 二进制，而是在创建 GeometryArtifact 时把 VM prediction 已计算出的 `computed_actual_thickness` 转换为 `derived_fields.current_thickness_field`。

### 5.4 prediction 后处理生成 current_thickness_field

上游 VM 的 `/prediction/wall-error` 后处理已经生成每个关键点的：

- `execution_surface_error`
- `computed_actual_thickness`
- `design_surface_error`

其中 `computed_actual_thickness` 应组织为下游 VM 的当前实际壁厚场：

```json
{
  "field_type": "current_thickness_field",
  "source": "prediction_postprocess",
  "source_node_id": "virtual-1",
  "source_result_version_id": "result-version-...",
  "source_artifact_id": "geo-...",
  "values": [
    {
      "id": "P1",
      "current_thickness": 5.02,
      "point_ref": {}
    }
  ],
  "summary": {
    "count": 1,
    "min": 5.02,
    "max": 5.02,
    "mean": 5.02
  }
}
```

限制：

- 当前字段是关键点级/采样点级厚度场，不是完整 tri-dexel 体素场；
- 下游 VM 的关键点 id / 顺序 / 坐标应与上游可匹配；
- 如果下游关键点集合不同，后续需要补充插值、重采样或坐标匹配规则。

## 6. Event Log 与 Snapshot

### 6.1 Event Log

event log 记录“发生了什么”，不直接承担大体积几何数据存储职责。

新增事件类型：

- `geometry_artifact_created`
- `geometry_artifact_imported`
- `geometry_artifact_marked_stale`
- `geometry_artifact_missing`
- `geometry_artifact_import_failed`
- `current_thickness_field_derived`
- `current_thickness_field_artifact_created`
- `current_thickness_field_parse_failed`

关键 payload：

```json
{
  "artifact_id": "geo-...",
  "source_node_id": "virtual-1",
  "consumer_node_id": "virtual-2",
  "source_result_version_id": "nrv-...",
  "source_visualization_session_id": "vis-...",
  "geometry_artifact_id": "geo-...",
  "field_summary": {},
  "stale": false,
  "skip_reason": null,
  "error": null
}
```

### 6.2 Snapshot

snapshot 必须包含：

- `geometry_artifacts`
- `active_geometry_artifact_refs`
- node result versions；
- visualization sessions；
- event log；
- workflow graph；
- VM node config 中的 `workpiece_source` 与 `design_surface_thickness`。

旧 snapshot 导入时：

- 缺少 `geometry_artifacts` 时补 `[]`；
- 缺少 `active_geometry_artifact_refs` 时补 `{}`；
- 旧 VM 节点默认 `workpiece_source.mode = parametric`。

## 7. Stale 传播

以下变化应导致相关 geometry artifact 或下游结果 stale：

- 上游 VM 节点 config 变化；
- 上游 VM 的 toolpath / stiffness / workpiece source 变化；
- 上游 VM 的工艺参数 base 或 patch 变化；
- 上游 VM result version 变化；
- 上游 geometry artifact 被替换或导入失败；
- 下游 VM 的 sampling config 或 thickness semantics config 变化。

最小传播策略：

1. 标记 artifact 自身 stale；
2. 标记显式引用该 artifact 或其 source node 的下游 VM result stale；
3. 如果 graph traversal 已有可用能力，可继续传播到所有下游；否则第一阶段至少覆盖直接下游，并在文档/测试中说明限制。

当下游 VM 读取 stale artifact 时，应阻止执行并提示用户先重新运行上游或 run all。

## 8. UI / UX 最小要求

不重做前端，但需要最小可操作性：

- VM config 可选择工件来源：参数化几何 / 文件几何占位 / 上游 VM 节点；
- 选择上游 VM 时，显示 source node label、artifact id、stale 状态；
- VM Inspector 显示 geometry source、artifact id、source result version；
- VM Inspector 显示 thickness 字段摘要，不显示误导性 scalar execution radial depth；
- 节点显示编号可作为阅读辅助，但数据流引用必须使用稳定 `node_id`。

关于编号与 `node_id`：

- `node_id` 是稳定内部引用；
- UI 编号是便于用户对照 event log 的显示顺序；
- artifact 必须保存 `source_node_id`，可额外保存 `source_node_label` 和显示编号；
- 不允许仅依赖显示编号建立数据流关系。

## 9. 已知风险

- base64 体积可能导致 snapshot 膨胀。
- `triDexelImageBase64` 的内部结构可能无法直接在前端解析厚度场，需要 Unity 协议补充或后端解析函数。
- 多 VM preview 时必须避免把 Unity completed 事件绑定到错误节点。
- 如果 `current_thickness_field` 派生失败但仍允许 prediction，会造成下游几何状态与预测状态不一致。
- 参数 base/patch 与 geometry artifact stale 必须联动，否则会出现工艺参数更新但几何输入仍旧的问题。

## 10. 实现顺序原则

后续 build 必须按以下顺序推进：

1. 先确认 tri-dexel 样例与 `current_thickness_field` 派生能力；
2. 再建立 GeometryArtifact 数据模型与 snapshot 兼容；
3. 再接入 Unity completed artifact capture；
4. 再接入 VM upstream geometry source；
5. 再接入 `ImportTriDexelImage` 与 prediction/preview 同 artifact 对齐；
6. 最后修正 Inspector 字段与 stale 传播。

不得先做 UI 表面字段而跳过数据流语义。

## 11. Unity Preview Runtime 稳定性补充设计

当前人工审查确认：VM3 / VM4 预览异常更可能来自 Unity 场景恢复与命令队列状态不稳定，而不是 wall-error prediction 计算错误。即使 workflow payload 审查显示 VM4 的 `workpiece.thickness`、`design_surface_thickness`、`execution_surface_thickness` 正确，Unity Machining Scene 仍可能实际复用 VM1 的旧场景或旧 error cloud。

因此后续 build 必须把 Unity preview 作为独立 runtime session 管理，而不是把 `ImportTriDexelImage`、error cloud refresh、`StartMachiningJob` 视为普通连续函数调用。

核心约束：

- 每次 VM preview 必须创建独立 `PreviewSession`，并绑定 `virtual_node_id`、`geometry_artifact_id`、`node_result_version_id`、payload fingerprint 与 scene provenance。
- Unity 命令必须串行化，不能在前一个 import / refresh / start 尚未稳定时发送下一个命令。
- `Unity runtime warning recovered`、`PlayerLoop recursive`、`table index out of bounds`、`null function`、`memory access out of bounds` 均应使当前 preview session 失效。
- 失效 session 不允许捕获 tri-dexel artifact，也不允许作为下游 fresh geometry 输入。
- 用户重新点击任意 VM preview 时，不应要求按 VM1 -> VM2 -> VM3 -> VM4 顺序重放；前端应根据 fresh upstream artifact 恢复该 VM 自己的场景。

详细任务与验收方案见：

- `openspec/changes/workflow-tridexel-geometry-dataflow/unity-preview-runtime-stability-plan.md`