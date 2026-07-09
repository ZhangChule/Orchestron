# 当前阶段人工验证方案

本文件对应当前 build 切片：P1-P5 的最小实现。目标是验证 tri-dexel artifact 已进入 workflow state，snapshot 可恢复，VM Inspector 不再使用误导性的 scalar execution radial depth 表达。

## 1. 构建与启动

如果使用 Docker workflow 前端：

```powershell
docker compose -f workflow_platform/docker/compose.yml up -d --build workflow-platform
```

如果只改前端静态文件且容器已挂载当前目录，也可以先刷新浏览器并清缓存验证；若看不到 UI 变化，再重新 build。

## 2. 单 VM artifact 采集验证

1. 打开 `http://localhost:8080/`。
2. 新建或加载一个包含 Virtual Machining 节点的 workflow。
3. 运行该 VM 节点，使其产生 wall-error prediction 和 preview session。
4. 点击 `Preview Cutting`，等待 Unity 完成一次切削。
5. 打开 DevTools Console，执行：

```js
window.workflowRuntimeState.geometry_artifacts
```

预期：

- 数组中至少有一个 artifact；
- `artifact_type` 为 `tridexel_image`；
- `format` 为 `unity-tridexel-image-base64`；
- `source_node_id` 指向当前 VM 节点；
- `source_visualization_session_id` 不为空；
- `data_base64` 不为空。

继续执行：

```js
window.workflowRuntimeState.event_log
  .filter(e => e.event_type && e.event_type.startsWith('geometry_'))
```

预期：

- 至少出现 `geometry_artifact_created`；
- event payload 中包含 `artifact_id`、`source_node_id`、`source_visualization_session_id`。

## 3. Snapshot 验证

1. 完成一次 VM preview 后，点击导出 snapshot。
2. 打开导出的 JSON，搜索：

```text
geometry_artifacts
active_geometry_artifact_refs
triDexelImageBase64
```

预期：

- snapshot 中包含 `geometry_artifacts`；
- `workflow_state.geometry_artifacts` 与顶层 `geometry_artifacts` 均可用于恢复；
- 旧 snapshot 导入时，即使没有这些字段，也不会失败。

3. 刷新页面，导入刚才的 snapshot。
4. 在 Console 再次执行：

```js
window.workflowRuntimeState.geometry_artifacts?.length
window.workflowRuntimeState.active_geometry_artifact_refs
```

预期：

- artifact 数量恢复；
- 对应 VM 的 artifact 引用可见。

## 4. VM Inspector 验证

选择一个 Virtual Machining 节点，检查 Inspector。

预期显示：

- `Geometry source`
- `Geometry artifact`
- `Design surface thickness`
- `Execution surface thickness`
- `Current thickness field`
- `Execution radial depth field`

不应再显示：

- `Design radial depth`
- `Execution radial depth`

说明：底层仍保留 scalar `radial_depth` 作为旧后端请求兼容字段，但不再作为 VM Inspector 的核心语义字段。

## 5. 上游几何读取验证

当前 UI 还没有完整的上游 VM 几何来源选择器。可以通过 snapshot JSON 手动配置下游 VM：

```json
{
  "params": {
    "workpiece_source": {
      "mode": "upstream_node",
      "upstream_virtual_node_id": "上游VM节点id",
      "geometry_artifact_id": null,
      "file_name": null
    }
  }
}
```

导入该 snapshot 后，选择下游 VM 并点击 `Preview Cutting`。

预期：

- 如果上游 artifact 存在且 fresh，Unity log 中应先出现 `ImportTriDexelImage` 相关发送记录，再执行 `StartMachiningJob`；
- event log 中出现 `geometry_artifact_imported`；
- 如果上游 artifact 缺失，应阻止 preview，并提示缺少 fresh tri-dexel geometry artifact，而不是静默退回参数化几何。

## 6. 当前限制

- `triDexelImageBase64 -> current_thickness_field` 当前只支持两种情况：
  - artifact 已显式包含 `derived_fields.current_thickness_field`；
  - base64 内容本身是可解析 JSON，且包含 `current_thickness_field`。
- 如果 Unity 返回的是不透明二进制 tri-dexel image，当前会返回 `tri_dexel_thickness_parser_missing`。这不是伪失败，而是为了避免 workflow 静默使用错误的参数化厚度继续预测。
- prediction 与 preview 完全共用同一 artifact 的闭环仍需下一阶段继续接入和实测。

## 7. 单 VM TriDexel 导出验证

本节用于确认前端交互可用，并导出 `triDexelImageBase64` 供人工解析。

1. 重新构建并打开 workflow 前端：

```powershell
docker compose -f workflow_platform/docker/compose.yml up -d --build workflow-platform
```

2. 打开 `http://localhost:8080/`，建议强制刷新一次页面，避免旧的 `app.js` 或 runtime 模块缓存。
3. 点击 `Load TriDexel Demo`。
4. 确认画布中只有一个 `TriDexel Export VM` 节点，选中该节点。
5. 点击 `Run Workflow`，确认 wall-error prediction 执行完成。
6. 点击 `Load Unity`，等待 Unity ready。
7. 点击 `Preview Cutting`，等待 Unity machining completed。
8. 点击 `Export TriDexel`。
9. 预期浏览器下载一个 `*-tridexel.json` 文件，其中包含：

```json
{
  "schema_version": "workflow-tridexel-image-export.v0",
  "artifact_id": "geo-...",
  "source_node_id": "virtual-...",
  "source_visualization_session_id": "vis-...",
  "derived_fields": {
    "current_thickness_field": {
      "field_type": "current_thickness_field",
      "values": []
    }
  },
  "triDexelImageBase64": "..."
}
```

10. 同时可在 Console 中检查：

```js
window.workflowRuntimeState.geometry_artifacts.at(-1)
```

预期：
- `artifact_type` 为 `tridexel_image`；
- `format` 为 `unity-tridexel-image-base64`；
- `data_base64` 非空；
- `summary.base64_length > 0`；
- `derived_fields.current_thickness_field.values.length > 0`。

继续检查 prediction 可复用的当前壁厚场：

```js
const artifact = window.workflowRuntimeState.geometry_artifacts.at(-1)
artifact.derived_fields.current_thickness_field.summary
artifact.derived_fields.current_thickness_field.values
artifact.derived_fields.current_thickness_field.point_refs
```

预期：
- `summary.count` 与当前 VM 预测点数量一致；
- `values` 来自 VM 预测后处理的 `computed_actual_thickness`；
- `point_refs` 保留关键点 id / 坐标 / 误差摘要，便于人工核对。

如果点击 `Export TriDexel` 时尚未运行 `Preview Cutting`，前端应提示先完成 wall-error prediction 与 cutting preview，而不是静默无反应。

## 8. 单独 TriDexel 文件导入与 VM 配置验证

本节用于验证 `geo-...-tridexel.json` 这类单独导出的文件可以重新进入 workflow。

1. 打开 `http://localhost:8080/` 并强制刷新。
2. 新增或选择一个 Virtual Machining 节点。
3. 点击右侧 Unity 面板中的 `Import TriDexel`，选择之前导出的 `geo-...-tridexel.json`。
4. 预期：
   - 该 JSON 会被转换为 `GeometryArtifact`；
   - 如果当前选中的是 VM 节点，该 VM 的 `workpiece_source.mode` 会自动设置为 `file`；
   - `workpiece_source.geometry_artifact_id` 会绑定到导入的 artifact；
   - Console 中可检查：

```js
window.workflowRuntimeState.geometry_artifacts.at(-1)
window.workflowRuntimeState.active_geometry_artifact_refs
```

说明：`window.workflowRuntimeState` 当前暴露的是运行状态快照，不直接暴露画布节点数组。VM 节点是否已绑定 artifact 主要通过 `active_geometry_artifact_refs` 与配置弹窗中的 `TriDexel artifact` 下拉框确认。

5. 打开该 VM 的 `Configure Node`。
6. 在 `工件/材料` 页签检查：
   - `Workpiece source` 有三种选项：`Parametric geometry`、`TriDexel file artifact`、`Upstream VM node`；
   - 选择 `TriDexel file artifact` 时，可以看到 `TriDexel artifact` 下拉框；
   - 选择 `Upstream VM node` 时，可以看到 `Upstream VM node` 下拉框。
7. 在 `工艺` 页签检查：
   - 存在 `Design surface thickness` 输入框；
   - 保存配置后，该值进入 `node.params.process.design_surface_thickness`。

Console 验证：

```js
window.workflowRuntimeState.geometry_artifacts.map(a => ({
  artifact_id: a.artifact_id,
  imported_file_name: a.data_ref?.imported_file_name,
  base64_length: a.summary?.base64_length
}))
window.workflowRuntimeState.active_geometry_artifact_refs
```

继续点击 `Run Workflow` 后，再次执行：

```js
window.workflowRuntimeState.geometry_artifacts.map(a => a.artifact_id)
window.workflowRuntimeState.active_geometry_artifact_refs
```

预期：导入的 `geo-...` artifact 仍然存在；当前 VM 对应的 artifact 引用没有因为 `run_all` 创建新 run 而丢失。

当前限制：

- 如果导入的是旧版本导出的 `geo-...-tridexel.json`，且文件中没有 `derived_fields.current_thickness_field`，prediction 会明确失败为 `tri_dexel_thickness_parser_missing`；这是设计内的阻断行为，避免静默回退到参数化厚度。
- 新版本导出的 `geo-...-tridexel.json` 会携带 `derived_fields.current_thickness_field`。这种文件既可用于 preview 的 `ImportTriDexelImage(base64)` 场景恢复，也可用于下游 VM prediction 的 `current_thickness_field`。
- 该文件仍可用于 preview 的 `ImportTriDexelImage(base64)` 场景恢复路径。

## 9. Unity Preview Runtime 稳定性人工审查补充

当前阶段如果出现以下 Unity warning/error，本次 preview 结果应被视为不可信：

- `Unity runtime warning recovered; preview runtime will reload on the next command`
- `PlayerLoop internal function has been called recursively`
- `table index is out of bounds`
- `null function`
- `memory access out of bounds`

下一轮 build 后需要重点验证：

1. VM1、VM2、VM3、VM4 顺序 preview 时，每个 VM 都生成独立 preview session。
2. VM4 preview 必须明确引用 VM3 的 fresh geometry artifact，而不是 VM1 artifact。
3. 再次点击 VM1 preview 后，再点击 VM4 preview，不应要求用户重新按序 preview；VM4 应恢复自己的 upstream artifact。
4. 一旦出现 Unity runtime warning，当前 preview session 应被标记 invalidated，且不得导出 fresh tri-dexel artifact。
5. event log / Console 审查必须能说明：哪个 VM、哪个 preview session、哪个 geometry artifact、哪个 workpiece thickness 和 error cloud summary 被发送给 Unity。

本补充验证的详细设计见：

- `openspec/changes/workflow-tridexel-geometry-dataflow/unity-preview-runtime-stability-plan.md`
## 10. P8 Build 后 Console 审查脚本

本轮 build 后请先强制刷新浏览器，确认页面加载的是 `app.js?v=workflow-tridexel-geometry-dataflow-v13`。

完成 VM1 / VM2 / VM3 / VM4 preview 后，在 Console 运行：

```js
(() => {
  const s = window.workflowRuntimeState ?? {}
  return (s.visualization_sessions ?? []).map(v => ({
    node: v.virtual_node_id,
    session: v.visualization_session_id,
    previewSession: v.preview_session_id,
    status: v.status,
    active: v.active,
    runtimeWarning: v.runtime_warning ?? null,
    geometryArtifact: v.geometry_artifact_id ?? v.scene_payload?.geometry_artifact_id ?? null,
    sceneT: v.scene_payload?.workpiece?.thickness,
    unityT: v.unity_payload?.workpiece?.thickness,
    designT: v.scene_payload?.thickness_semantics?.design_surface_thickness,
    execT: v.scene_payload?.thickness_semantics?.execution_surface_thickness,
    first3Errors: (v.unity_payload?.points ?? []).slice(0, 3).map(p => p.error),
  }))
})()
```

检查 preview 前的 scene provenance：

```js
(() => {
  const s = window.workflowRuntimeState ?? {}
  return (s.event_log ?? [])
    .filter(e => e.event_type === 'preview_scene_expected' || e.event_type === 'preview_session_invalidated')
    .map(e => ({
      seq: e.event_sequence,
      type: e.event_type,
      node: e.node_id,
      session: e.payload?.visualization_session_id,
      artifact: e.payload?.geometry_artifact_id,
      source: e.payload?.source_node_id,
      expectedT: e.payload?.expected_workpiece_thickness,
      designT: e.payload?.expected_design_surface_thickness,
      execT: e.payload?.expected_execution_surface_thickness,
      warning: e.payload?.runtime_warning,
    }))
})()
```

验收关注点：

- VM4 的 `preview_scene_expected` 应引用 VM3 产出的 fresh geometry artifact。
- 如果出现 Unity runtime warning，当前 session 应变为 `invalidated`，并出现 `preview_session_invalidated` 事件。
- invalidated session 不应生成 fresh tri-dexel artifact。
- 重复点击 VM1 preview 后，再点击 VM4 preview，VM4 不应要求重新按序 preview；只要 VM3 artifact fresh，应恢复 VM3 artifact。
## 11. P8 v14 补充验证：禁止单命令自动重试

本轮进一步修正了 Unity runtime warning 后的处理语义：

- 如果 `StartMachiningJob` 或其它 Unity 命令抛出 `null function`、`table index is out of bounds`、`memory access out of bounds`、`PlayerLoop recursive` 等 recoverable runtime error，前端不再重载后重试同一个 Unity 方法。
- 当前 preview session 会被标记为 `invalidated`。
- 旧 Unity runtime 会尝试 `Quit()`。
- 用户需要重新点击该 VM 的 `Preview Cutting`，让前端重新执行完整链路：`reset/import/error-cloud/start-machining`。

这是为了避免失败发生在 `StartMachiningJob` 时，前端只重试 machining 命令，却没有重新导入当前 VM 的场景，从而把 VM3 / VM4 的加工命令打到 VM1 旧场景上。

测试时请确认页面加载：

```text
app.js?v=workflow-tridexel-geometry-dataflow-v14
```

如果 VM3 出现 `table index is out of bounds`，预期行为不是继续判定该次 preview 成功，而是：

1. workflow event log 出现 `preview_session_invalidated`；
2. 该次 session 的 `status` 为 `invalidated`；
3. 该次 session 不产生 fresh tri-dexel artifact；
4. 下一次点击 VM3 / VM4 preview 时重新走完整 scene restore 链路。
## 12. P8 v15 补充验证：Preview Runtime Readiness 与 VM2 云图刷新

本轮修复目标：

- 前端不再把 Unity runtime warning 后的状态简单显示为 succeed/done。
- `window.workflowRuntimeState.preview_runtime_status` 明确表达下一次 preview 是否安全。
- VM2/VM3 这类 imported/upstream 场景刷新误差云图时，优先使用当前 preview session 的 `unity_payload.points`，避免继续使用节点旧坐标或旧云图。

### 12.1 确认加载版本

强制刷新浏览器后，Network 中应看到：

```text
app.js?v=workflow-tridexel-geometry-dataflow-v15
```

### 12.2 判断下一次 preview 是否安全

每次点击下一个 Virtual Machining 节点的 Preview Cutting 前，先在 Console 执行：

```js
window.workflowRuntimeState.preview_runtime_status
```

允许继续 preview 的条件：

```js
window.workflowRuntimeState.preview_runtime_status?.safe_to_preview === true
```

如果状态为：

```js
status: "recovering"
safe_to_preview: false
```

请等待恢复窗口结束后再执行下一次 preview。恢复窗口结束后前端会自动刷新该状态。

### 12.3 审查当前 VM 云图是否使用当前 session 点集

执行 VM2 preview 后，在 Console 执行：

```js
(() => {
  const s = window.workflowRuntimeState ?? {}
  const active = s.active_visualization_session_id
  const session = (s.visualization_sessions ?? []).find(v => v.visualization_session_id === active)
  const cloud = window.workflowLastWallErrorFieldPayload
  return {
    active,
    node: session?.virtual_node_id,
    sessionFirst3: (session?.unity_payload?.points ?? []).slice(0, 3).map(p => ({ id: p.id, x: p.x, y: p.y, z: p.z, error: p.error })),
    cloudFirst3: (cloud?.points ?? []).slice(0, 3).map(p => ({ id: p.id, x: p.x, y: p.y, z: p.z, error: p.error })),
    sameFirst3: JSON.stringify((session?.unity_payload?.points ?? []).slice(0, 3).map(p => [p.id, p.x, p.y, p.z, p.error]))
      === JSON.stringify((cloud?.points ?? []).slice(0, 3).map(p => [p.id, p.x, p.y, p.z, p.error])),
  }
})()
```

期望：

- `node` 是当前 preview 的 VM 节点。
- `sameFirst3` 为 `true`。
- VM2 的 `error` 数值应不同于 VM1 时，`cloudFirst3` 也应同步体现 VM2 数值。

### 12.4 仍需人工重点观察

如果 Unity 再次出现：

- `table index is out of bounds`
- `null function`
- `memory access out of bounds`
- `PlayerLoop internal function has been called recursively`

当前 preview session 应变为 invalidated/recovering，不应作为有效可视化结果。下一次 preview 应等待 `safe_to_preview === true`。

如果在 `safe_to_preview === true` 后仍连续第二次导致 Unity 无响应，则说明当前 Unity WebGL build 仍缺少可由前端可靠等待的 `Cancel/Stop/SceneRestored` 生命周期协议；前端只能降低重入概率，不能从 Unity 内部崩溃中完全恢复。
## 13. P8 v16 补充验证：Unity Preview Status 页面提示

本轮将右侧 Unity 面板状态行改为明确的操作者提示，不再要求每次打开 Console 判断是否可继续。

状态行固定使用以下文案之一：

```text
Unity Preview Status: Ready for next preview
Unity Preview Status: Preview running: VM2
Unity Preview Status: Recovering Unity runtime: wait 1.8s
Unity Preview Status: Reloading Unity runtime
Unity Preview Status: Preview invalidated: rerun this VM
```

人工操作规则：

1. 看到 `Ready for next preview`：可以执行下一个 VM preview。
2. 看到 `Preview running: VMx`：当前 VM 正在可视化，不要点击其它 VM preview。
3. 看到 `Recovering Unity runtime: wait ...`：Unity runtime 处于异常恢复窗口，不要继续点击。
4. 看到 `Reloading Unity runtime`：前端正在重新加载 Unity runtime，不要继续点击。
5. 看到 `Preview invalidated: rerun this VM`：上一轮 preview 被 runtime warning 判定无效，应重新运行当前 VM 的 Preview Cutting；重新成功后才进入下一个 VM。

说明：恢复窗口默认约 1.8s，但 imported/upstream geometry 还包含 Unity reload、TriDexel import settle、error cloud refresh 和 StartMachiningJob，因此 VM2 -> VM3 的体感等待可能明显长于 VM1 -> VM2。
## 14. P8 v17 补充验证：Canvas 状态提示同步 Unity Preview Status

由于右侧 Unity 面板信息密度较高，本轮将 `Unity Preview Status` 同步到工作流 canvas 状态提示，即原先显示 `Unity runtime warning recovered; wait until preview_runtime_status.safe_to_preview is true before the next preview` 的位置。

人工验证：

1. 正常待机或成功完成 preview 后，canvas 状态提示应显示：

```text
Unity Preview Status: Ready for next preview
```

2. VM preview 执行中，canvas 状态提示应显示：

```text
Unity Preview Status: Preview running: VMx
```

3. Unity runtime warning 后，canvas 状态提示应显示：

```text
Unity Preview Status: Recovering Unity runtime: wait 1.8s
```

4. 恢复窗口结束但该次 preview 已失效时，canvas 状态提示应显示：

```text
Unity Preview Status: Preview invalidated: rerun this VM
```

此时应重新运行当前 VM 的 Preview Cutting，成功后再进入下一个 VM。
## 15. P8 v18 补充验证：Canvas 状态提示仅在选中 VM 时显示

本轮将 canvas 下方的 `Unity Preview Status` 从全局常驻提示改为选中 VM 后的上下文提示，避免它覆盖普通 workflow 状态。

人工验证：

1. 点击任意非 Virtual Machining 节点，canvas 下方不应被 `Unity Preview Status` 常驻覆盖。
2. 点击任意 Virtual Machining 节点，canvas 下方应显示当前 Unity preview runtime 状态：

```text
Unity Preview Status: Ready for next preview
```

3. 如果该 VM 正在 preview，canvas 下方应显示：

```text
Unity Preview Status: Preview running: VMx
```

4. 如果 Unity runtime 正在恢复或该 VM preview 已失效，点击该 VM 后应看到：

```text
Unity Preview Status: Recovering Unity runtime: wait 1.8s
Unity Preview Status: Preview invalidated: rerun this VM
```

5. 普通 workflow 操作状态，例如 running、done、link created，不应被未选中 VM 的 Unity 状态反复覆盖。
## 16. P8 v19 补充验证：function signature mismatch 与 runtime_unstable

本轮将 `function signature mismatch` 视为 recoverable Unity runtime warning，并增加重复 warning 后的 preview 阻止。

人工验证：

1. 按 VM1 -> VM2 -> VM3 -> VM4 顺序进行 Preview Cutting。
2. 如果某个 VM 出现 `function signature mismatch`、`table index is out of bounds`、`null function` 或 `memory access out of bounds`，当前 session 应被标记 invalidated，而不是让错误裸露为未处理异常。
3. 如果同一页面生命周期内连续出现 recoverable Unity runtime warning，选中 VM 后 canvas 下方应显示：

```text
Unity Preview Status: Runtime unstable; reset Unity before next preview
```

4. 此时再次点击 Preview Cutting 不应继续向 Unity 发送新的 preview 命令。
5. 点击 Reset Scene 后，runtime warning 计数清空；重新选择 VM 后应恢复到可继续人工测试的状态。
6. Console 可检查：

```js
window.workflowRuntimeState.preview_runtime_status
```

其中应能看到 `status: "runtime_unstable"` 或恢复后的 `status: "ready_for_next_preview"`。