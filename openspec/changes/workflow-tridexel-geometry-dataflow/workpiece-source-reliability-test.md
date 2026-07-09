# VM 工件来源可靠性回归测试

本文档用于当前 change `workflow-tridexel-geometry-dataflow` 的人工验收，覆盖三种 VM 工件来源：

- Parametric geometry
- TriDexel file artifact
- Upstream VM node

本轮修复后的关键约束：

- `Workpiece preset` 与五个几何尺寸只属于 `Parametric geometry`。
- `TriDexel file artifact` 模式只选择或导入几何 artifact。
- `Upstream VM node` 模式只指定上游 VM 节点。
- Tool 示意图只在 `Tool` tab 显示。
- TriDexel artifact preview 调用顺序为 `ImportTriDexelImage(base64)` -> `StartMachiningJob(payload)`，不再先调用 `LoadWorkpieceAndTool()` 重置场景。
- TriDexel artifact preview 在调用 `ImportTriDexelImage(base64)` 前会发布当前节点的 `scenePayload`，并在导入后等待 Unity 场景稳定，再调用 `StartMachiningJob(payload)`。

## 本轮 memory access out of bounds 修复点

本轮问题集中在 TriDexel file artifact / upstream VM node 的切削预览路径。

修复前，workflow 前端会在 `ImportTriDexelImage(base64)` 后立刻调用 `StartMachiningJob(payload)`。如果 Unity 侧 tri-dexel 场景恢复尚未稳定，就可能在 WebAssembly 侧出现 `memory access out of bounds`。此外，artifact 路径不像 parametric `LoadWorkpieceAndTool()` 路径那样发布 `window.workflowVirtualMachiningScenePayload`，Unity 侧如果读取该全局上下文，也会缺少当前节点的 scene payload。

修复后：

- artifact preview 先设置 `window.workflowVirtualMachiningScenePayload = scenePayload`；
- 再调用 `ImportTriDexelImage(base64)`；
- 前端等待一个短暂的 Unity import settle 窗口；
- 最后才调用 `StartMachiningJob(payload)`；
- 自动化测试已覆盖该调用顺序，但 Unity WebGL 场景是否仍报错需要按本文档继续人工验证。

## 本轮误差颜色映射修复点

非参数化工件来源下，`execution_radial_depth` 已经不是一个全局标量，而是来自 `current_thickness_field - execution_surface_thickness` 的每关键点场。修复前，Unity payload 中误差点位置仍使用 `process.radialDepth` 这个兼容后端的平均标量进行坐标偏移：

```text
Unity x = backend y - process.radialDepth
```

这会使 TriDexel file artifact / upstream VM node 场景中的误差点整体或局部偏离加工后实体，从而出现“切削可见但误差颜色映射不可见”的现象。

修复后：

- `postprocessWallErrorPointsForDesignSurface()` 会把每个点的 `execution_radial_depth` 带入前端结果；
- `buildUnityMachiningJobPayload()` 在坐标变换时优先使用每个点自己的 `execution_radial_depth`；
- 只有旧数据缺少 per-point 切深时，才回退到 `process.radialDepth`；
- 非参数化工件来源下，wall-error prediction 请求本身也会使用 artifact 的 `geometry_metadata.workpiece` 作为工件 envelope，避免后端仍按隐藏的 parametric 默认工件生成点坐标；
- 自动化测试已覆盖 per-point 坐标映射。

## Upstream VM node 的计算与预览依赖

上游 VM 节点完成 wall-error prediction 后，workflow 会立即创建一个 computation-only geometry artifact：

- `artifact_type = "current_thickness_field"`
- 不包含 `triDexelImageBase64`
- 包含 `derived_fields.current_thickness_field`
- 用于下游 `Upstream VM node` 的壁厚预测计算

这意味着：

- 下游 VM 的 wall-error prediction 不再必须等上游执行 `Preview Cutting` / `Export TriDexel`；
- 下游 VM 的 Unity preview 仍然需要可导入的 `triDexelImageBase64`；
- 如果只运行了上游 prediction，随后对下游点击 `Preview Cutting`，应提示缺少 tri-dexel image data，而不是把它误认为计算失败；
- 如果要验证完整几何实体传递，仍需先对上游 VM 执行 `Preview Cutting` 并捕获/导出 TriDexel。

## 准备

1. 重新构建并启动 workflow 前端：

```powershell
docker compose -f workflow_platform/docker/compose.yml up -d --build --no-deps workflow-platform
```

2. 打开 `http://localhost:8080/`，强制刷新页面。
3. 先点击 `Load Unity`，等待 Unity ready。

## Baseline：Parametric VM 导出 TriDexel

创建一个独立 Virtual Machining 节点，配置如下：

- Workpiece source：`Parametric geometry`
- Workpiece preset：`Operation demo`
- 当前壁厚：`6 mm`
- Design surface thickness：`5 mm`
- Toolpath：`process_apps\thinwall-dt\frontend\public\process1.txt`
- Stiffness：`process_apps\thinwall-dt\frontend\public\stiffness3.1.txt`

执行：

1. `Run Workflow`
2. `Preview Cutting`
3. 等待 Unity machining scene 完成预览。
4. 点击 `Export TriDexel` 保存 `geo-...-tridexel.json`。

预期：

- 壁厚误差预测成功。
- Unity 场景可以显示工件、刀具和切削过程。
- 导出的 JSON 包含 `triDexelImageBase64`。
- 导出的 JSON 包含 `derived_fields.current_thickness_field`，其数值来源于本次预测后的计算实际壁厚。

Console 检查：

```js
window.workflowRuntimeState.geometry_artifacts.at(-1)
```

预期：

- `artifact_type === "tridexel_image"`
- `data_base64` 非空
- `geometry_metadata.workpiece.thickness === 6`
- `geometry_metadata` 只包含 `coordinate_space` 和五个 workpiece envelope 尺寸，不包含完整 `scene_payload` / `unity_payload`
- `derived_fields.current_thickness_field.values.length > 0`

注意：本轮修复前导出的旧 `geo-...-tridexel.json` 缺少 `geometry_metadata`，不能用于验证下游 Unity preview。请先用 Baseline 步骤重新导出一次 artifact。

## Test 1：TriDexel File Artifact VM

创建第二个独立 Virtual Machining 节点，配置如下：

- Workpiece source：`TriDexel file artifact`
- TriDexel artifact：导入 Baseline 导出的 `geo-...-tridexel.json`
- Design surface thickness：`4 mm`
- Toolpath：`process_apps\thinwall-dt\frontend\public\process2.txt`
- Stiffness：`process_apps\thinwall-dt\frontend\public\stiffness3.2.txt`

执行：

1. `Run Workflow`
2. 选择第二个 VM 节点。
3. `Preview Cutting`

预期：

- 壁厚误差预测成功。
- Preview Cutting 不再出现 `null function`。
- Unity 先恢复 TriDexel 场景，再在该场景上执行当前节点的 `StartMachiningJob(payload)`。
- 因为没有 WTC/parameter-update，`execution_surface_thickness` 应等于当前节点配置的 `design_surface_thickness`。
- `execution_radial_depth_field` 是由 `current_thickness_field - execution_surface_thickness` 得到的矩阵/场，不再是单个标量。

Console 检查：

```js
const s = window.workflowRuntimeState
s.geometry_artifacts.map(a => ({
  id: a.artifact_id,
  file: a.data_ref?.imported_file_name,
  hasBase64: Boolean(a.data_base64),
  workpieceThickness: a.geometry_metadata?.workpiece?.thickness,
  hasThicknessField: Boolean(a.derived_fields?.current_thickness_field)
}))
s.event_log.filter(e => e.event_type?.includes('geometry'))
```

预期：

- 导入的 artifact 可见。
- 运行和 preview 事件中能看到 `geometry_artifact_imported`。

旧 artifact 兼容性检查：
- 如果导入的 `geo-...-tridexel.json` 缺少 `geometry_metadata.workpiece`，点击 `Preview Cutting` 应由 workflow 前端阻止，并提示重新用当前 build 导出。
- 这种情况下不应继续调用 Unity `ImportTriDexelImage` / `StartMachiningJob`，也不应再出现 Unity WASM `memory access out of bounds`。

## Test 2：VM -> WTC -> Parameter Update -> VM，第二个 VM 使用 File Artifact

在 Test 1 的两个 VM 基础上加入：

- VM1 -> WTC
- WTC -> Parameter-update
- Parameter-update -> VM2

配置：

- WTC method：`mirror`
- Parameter-update operation：`add`
- VM2 仍保持 `TriDexel file artifact`
- VM2 其它配置不变

执行：

1. `Run Workflow`
2. 检查 VM1 与 VM2 的 Inspector。
3. 对 VM2 执行 `Preview Cutting`。

预期：

- VM1 的参数和结果不应被 VM2 或 WTC 回写。
- VM2 的几何输入仍来自指定 TriDexel file artifact。
- WTC/update 会改变 VM2 的 `execution_surface_thickness`。
- VM2 的壁厚预测结果应随 `execution_surface_thickness` 改变。
- `execution_radial_depth_field` 应基于导入 artifact 的 `current_thickness_field` 与更新后的 `execution_surface_thickness` 重新计算。

Console 检查：

```js
window.workflowRuntimeState.event_log.filter(e =>
  ['parameter_patch_created', 'parameter_patch_applied', 'current_thickness_field_derived'].includes(e.event_type)
)
```

预期：

- 能看到 patch 创建与应用事件。
- 能看到 VM2 从 artifact 派生当前壁厚场。

## Test 3：VM -> WTC -> Parameter Update -> VM，第二个 VM 使用 Upstream VM Node

将 Test 2 中 VM2 的工件来源改为：

- Workpiece source：`Upstream VM node`
- Upstream VM node：`#1 Virtual Machining Platform (virtual-machining-1)` 或当前 VM1 对应节点

其它配置保持不变。

执行：

1. `Run Workflow`
2. 选择 VM2。
3. `Preview Cutting`

预期：

- VM2 读取 VM1 最新 fresh TriDexel artifact。
- VM2 的 prediction 与 preview 使用同一个 `geometry_artifact_id`。
- 若 VM1 被修改后 artifact stale 或缺失，VM2 不应静默回退到 parametric geometry，而应提示需要重新运行上游。
- 在 VM1 输出 artifact 与导入文件 artifact 数据一致的前提下，Test 3 结果应与 Test 2 近似一致。

Console 检查：

```js
window.workflowRuntimeState.event_log.filter(e =>
  e.payload?.consumer_node_id || e.payload?.artifact_id || e.payload?.geometry_artifact_id
)
```

预期：

- VM2 的事件能追溯到 VM1 的 `artifact_id`。
- Preview 事件的 `node_result_version_id` 与 `geometry_artifact_id` 可对照。

## 本轮自动化回归覆盖

已新增/更新前端回归断言：

- VM 配置弹窗中 parametric 几何字段只挂在 `data-workpiece-source-panel="parametric"` 下。
- Tool preview card 只在 `Tool` tab 显示。
- TriDexel artifact preview 不再先执行 `loadScene(scenePayload)`，而是先 `importTriDexelImage(base64)`，再 `startMaterialRemovalPreview(payload)`。

验证命令：

```powershell
node --test workflow_platform/frontend/tests/appRegression.test.mjs
node --test workflow_platform/frontend/tests/*.mjs
Get-ChildItem -Path workflow_platform/frontend -Recurse -Include *.js,*.mjs | ForEach-Object { node --check $_.FullName }
```

## Runtime 稳定性阻塞说明

人工审查显示：当 Unity 出现 `runtime warning recovered`、`PlayerLoop recursive`、`table index is out of bounds` 等 warning/error 后，后续 VM preview 可能出现“payload 审查正确，但 Unity 场景仍复用旧 VM 场景”的问题。

因此在下一轮 build 前，本测试文档中的 VM3 / VM4 可视化结论需要附加判断：

- 如果 preview 过程中出现 Unity runtime warning，则该次可视化结果不作为通过依据。
- 如果 VM4 payload 显示引用 VM3 artifact，但画面人工观察仍像 VM1 工件，则优先判定为 Unity preview runtime session / command queue 问题，而不是 wall-error prediction 问题。
- 下一轮 build 需要先实现 `unity-preview-runtime-stability-plan.md` 中的 PreviewSession 状态机、Unity command queue 和 warning invalidation，再重新执行本测试。

下一轮通过标准：

1. VM1 -> VM2 -> VM3 -> VM4 顺序 preview 无 warning。
2. 任意 VM 重复 preview 不污染其它 VM 的场景归属。
3. VM4 preview 明确恢复 VM3 artifact，且人工观察与 payload 审查一致。
4. 出现 warning 时当前 session 失效，不生成 fresh artifact。