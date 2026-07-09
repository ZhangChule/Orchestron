# 任务拆解

本 change 的任务顺序用于后续 build。每个阶段完成并验证后再进入下一阶段，避免实现顺序混乱。

## P0：协议与样例确认

- [x] T0.1 确认 Unity tri-dexel 协议
  - purpose：确认 `ExportTriDexelImage`、`ImportTriDexelImage`、`StartMachiningJob`、`UnityMachiningCompleted` 的真实调用关系。
  - affected directories：`contracts/virtual-machining`、`workflow_platform/frontend`
  - expected output：接口边界说明，确认 tri-dexel 是当前几何状态传递载体。
  - verification method：能说明 `ImportTriDexelImage(base64)` 后 `StartMachiningJob(payload)` 在恢复后的场景实体上执行。
  - code change allowed：no
  - runtime behavior：must remain unchanged

- [x] T0.2 检查 tri-dexel 样例数据
  - purpose：判断能否从 `triDexelImageBase64` 或导出 JSON 中派生 `current_thickness_field`。
  - affected directories：`contracts/virtual-machining`、用户提供的 tri-dexel 样例、`workflow_platform/frontend/runtime`
  - expected output：`deriveCurrentThicknessFieldFromTriDexelArtifact` 的可行性结论。
  - verification method：若可解析，列出字段路径和采样规则；若不可解析，明确阻塞原因和所需 Unity/后端协议补充。
  - code change allowed：no
  - runtime behavior：must remain unchanged

- [x] T0.3 确认 legacy 兼容边界
  - purpose：确保旧 workflow 默认仍走参数化几何。
  - affected directories：`workflow_platform/frontend`
  - expected output：旧节点默认 `workpiece_source.mode = parametric`。
  - verification method：导入旧 snapshot 不报错，旧 VM 可继续运行。
  - code change allowed：no
  - runtime behavior：must remain unchanged

## P1：GeometryArtifact 数据模型

- [x] T1.1 新增 GeometryArtifact helper
  - purpose：建立 tri-dexel 几何产物的最小结构。
  - affected directories：`workflow_platform/frontend/runtime`
  - expected output：`createGeometryArtifact`、`addGeometryArtifact`、`findGeometryArtifactsForNode`、`findLatestFreshGeometryArtifactForNode`。
  - verification method：单元测试覆盖创建、查询、fresh/stale 筛选。
  - code change allowed：yes
  - runtime behavior：must remain unchanged

- [x] T1.2 扩展 WorkflowState 与 snapshot
  - purpose：让 workflow 可保存和恢复 geometry artifacts。
  - affected directories：`workflow_platform/frontend/runtime`
  - expected output：`geometry_artifacts`、`active_geometry_artifact_refs`，旧 snapshot 自动补空。
  - verification method：新 snapshot 包含字段，旧 snapshot 导入成功。
  - code change allowed：yes
  - runtime behavior：must remain unchanged

- [x] T1.3 新增 geometry event 类型
  - purpose：让 event log 能解释几何 artifact 的创建、导入、缺失、stale。
  - affected directories：`workflow_platform/frontend/runtime`
  - expected output：geometry event payload 包含 artifact、source node、consumer node、result/session 引用。
  - verification method：单元测试或人工运行后可读 event log。
  - code change allowed：yes
  - runtime behavior：must remain unchanged

## P2：tri-dexel 到厚度场函数边界

- [x] T2.1 定义 `deriveCurrentThicknessFieldFromTriDexelArtifact`
  - purpose：建立从上游几何状态派生当前壁厚场的明确入口。
  - affected directories：`workflow_platform/frontend/runtime`
  - expected output：函数输入、输出、错误结构稳定。
  - verification method：测试覆盖成功解析或明确失败。
  - code change allowed：yes
  - runtime behavior：only affects new upstream geometry path

- [x] T2.2 实现或显式阻塞 current_thickness_field 派生
  - purpose：避免无法解析时静默使用旧参数化厚度。
  - affected directories：`workflow_platform/frontend/runtime`
  - expected output：可解析则返回 field summary；不可解析则返回 `tri_dexel_thickness_parser_missing`。
  - verification method：下游 VM 在缺少解析能力时阻止 prediction，并记录 `current_thickness_field_parse_failed`。
  - code change allowed：yes
  - runtime behavior：only affects new upstream geometry path

- [x] T2.3 计算 `execution_radial_depth_field`
  - purpose：用正确厚度语义替代 scalar execution radial depth。
  - affected directories：`workflow_platform/frontend/runtime`
  - expected output：`execution_radial_depth_field = current_thickness_field - execution_surface_thickness`。
  - verification method：测试覆盖标量 execution surface thickness 与多点 current thickness field 的计算。
  - code change allowed：yes
  - runtime behavior：only affects new thickness-field path

## P3：VM 节点几何来源与厚度参数

- [x] T3.1 为 VM config 增加 `workpiece_source`
  - purpose：显式表达参数化几何、文件几何、上游节点几何三种来源。
  - affected directories：`workflow_platform/frontend/app.js`、`workflow_platform/frontend/runtime`
  - expected output：旧节点默认 `parametric`，新节点可选 `upstream_node`。
  - verification method：旧 workflow 不变；新 workflow 可选择上游 VM。
  - code change allowed：yes
  - runtime behavior：legacy behavior must remain unchanged

- [x] T3.2 为 VM config 增加 `design_surface_thickness`
  - purpose：让设计加工面壁厚成为 VM 节点可交互定义的工艺参数 base。
  - affected directories：`workflow_platform/frontend/app.js`、`workflow_platform/frontend/runtime`
  - expected output：VM config、process parameter base、snapshot 均保存 `design_surface_thickness`。
  - verification method：运行前后设计值不被 runtime patch 静默覆盖。
  - code change allowed：yes
  - runtime behavior：legacy defaults must remain compatible

- [x] T3.3 运行时计算 `execution_surface_thickness`
  - purpose：由补偿/参数 patch 确定执行加工面壁厚。
  - affected directories：`workflow_platform/frontend/runtime`
  - expected output：`execution_surface_thickness` 与 patch/event 可追踪。
  - verification method：修改上游补偿后，下游 VM 使用新的 execution surface thickness。
  - code change allowed：yes
  - runtime behavior：existing closed-loop behavior must remain consistent

## P4：Unity artifact 捕获与导入

- [x] T4.1 将 Unity completed result 绑定到 active visualization session
  - purpose：避免多 VM preview 时采错来源。
  - affected directories：`workflow_platform/frontend/virtualMachiningWidget.js`、`workflow_platform/frontend/runtime`
  - expected output：artifact 保存 `source_node_id`、`source_visualization_session_id`、`source_result_version_id`。
  - verification method：多 VM preview 后每个 artifact 来源正确。
  - code change allowed：yes
  - runtime behavior：current preview behavior must remain unchanged

- [x] T4.2 上游 VM 完成后创建 GeometryArtifact
  - purpose：让 `triDexelImageBase64` 进入 WorkflowState。
  - affected directories：`workflow_platform/frontend/runtime`、`workflow_platform/frontend/app.js`
  - expected output：`geometry_artifact_created` event 与 `geometry_artifacts` 记录。
  - verification method：单 VM run/preview 后可在 state 和 snapshot 中看到 artifact。
  - code change allowed：yes
  - runtime behavior：current preview behavior must remain unchanged

- [x] T4.3 下游 VM preview 前导入上游 artifact
  - purpose：让 Unity 场景恢复到上游加工后的实体。
  - affected directories：`workflow_platform/frontend/app.js`、`workflow_platform/frontend/virtualMachiningWidget.js`
  - expected output：调用顺序为 `ImportTriDexelImage(base64)` -> `StartMachiningJob(payload)`。
  - verification method：测试或日志确认调用顺序；payload 结构不被改成 tri-dexel workpiece。
  - code change allowed：yes
  - runtime behavior：only affects `upstream_node` geometry path

- [x] T4.4 prediction 与 preview 使用同一 artifact
  - purpose：保证计算侧和可视化侧围绕同一个几何状态对齐。
  - affected directories：`workflow_platform/frontend/runtime`、`workflow_platform/frontend/app.js`
  - expected output：prediction context、preview session、event log 均记录同一 `geometry_artifact_id`。
  - verification method：下游 VM 执行记录中 prediction 与 preview artifact id 一致。
  - code change allowed：yes
  - runtime behavior：only affects `upstream_node` geometry path

- [x] T4.5 将 prediction 后处理壁厚场写入 GeometryArtifact
  - purpose：在不解析 Unity tri-dexel 二进制的前提下，让 GeometryArtifact 同时携带可视化恢复数据与 prediction 可复用的 `current_thickness_field`。
  - affected directories：`workflow_platform/frontend/runtime`、`workflow_platform/frontend/app.js`
  - expected output：新生成/导出的 artifact 包含 `derived_fields.current_thickness_field`，其值来自上游 VM `computed_actual_thickness`。
  - verification method：测试覆盖 artifact 创建、导出、导入后 `deriveCurrentThicknessFieldFromTriDexelArtifact` 可读取该字段。
  - code change allowed：yes
  - runtime behavior：only affects geometry artifact capture/import path

## P5：Inspector 与 UI 最小修正

- [x] T5.1 替换 VM Inspector 中的 radial depth 标量表达
  - purpose：避免把执行径向切深误显示为标量。
  - affected directories：`workflow_platform/frontend/app.js`、可能的 CSS 文件
  - expected output：取消或降级 `Design radial depth` / `Execution radial depth`。
  - verification method：Inspector 不再把 execution radial depth 显示为单个 mm 数值。
  - code change allowed：yes
  - runtime behavior：UI display only

- [x] T5.2 显示 surface thickness 与 field 摘要
  - purpose：让用户能检查厚度语义是否正确。
  - affected directories：`workflow_platform/frontend/app.js`
  - expected output：显示 `design_surface_thickness`、`execution_surface_thickness`、`current_thickness_field` summary、`execution_radial_depth_field` summary。
  - verification method：summary 包含 source、count、min、max、mean。
  - code change allowed：yes
  - runtime behavior：UI display only

- [x] T5.3 显示 geometry source 与 artifact 引用
  - purpose：让多 VM 几何传递可被人工审查。
  - affected directories：`workflow_platform/frontend/app.js`
  - expected output：显示 source node label、artifact id、stale 状态。
  - verification method：下游 VM Inspector 能对应上游 artifact。
  - code change allowed：yes
  - runtime behavior：UI display only

## P6：Stale、Run Mode 与 Snapshot 一致性

- [ ] T6.1 几何 artifact stale 传播
  - purpose：避免下游静默使用过期几何状态。
  - affected directories：`workflow_platform/frontend/runtime`
  - expected output：上游变化时 artifact 和下游结果 stale。
  - verification method：修改上游 VM config/toolpath/stiffness/patch 后，下游 artifact 引用被阻止或 stale。
  - code change allowed：yes
  - runtime behavior：only affects stale correctness

- [ ] T6.2 run all / run from selected 与 geometry artifact 对齐
  - purpose：确保运行模式不会绕过上游几何依赖。
  - affected directories：`workflow_platform/frontend/runtime`、`workflow_platform/frontend/app.js`
  - expected output：run from selected 会追溯上游 geometry dependency；stale 时阻止。
  - verification method：上游 fresh 时可复用，上游 stale 时提示先重跑。
  - code change allowed：yes
  - runtime behavior：only affects geometry-aware workflows

- [ ] T6.3 snapshot round-trip
  - purpose：确保几何数据流可回溯。
  - affected directories：`workflow_platform/frontend/runtime`
  - expected output：snapshot 导出/导入恢复 artifacts、refs、events、node configs。
  - verification method：导出、刷新、导入后，下游 VM 仍能识别上游 artifact 或 stale 状态。
  - code change allowed：yes
  - runtime behavior：snapshot compatibility must be preserved

## P7：验证

- [ ] T7.1 单 VM artifact 采集测试
  - purpose：验证上游 VM 能产生 geometry artifact。
  - affected directories：`workflow_platform/frontend/tests` 或人工验证文档
  - expected output：单 VM 运行后 state 中有 artifact。
  - verification method：浏览器 Console 或测试断言确认 artifact 字段完整。
  - code change allowed：yes
  - runtime behavior：current VM behavior must remain unchanged

- [ ] T7.2 VM-A -> VM-B 几何传递测试
  - purpose：验证下游 VM 使用上游 tri-dexel 状态。
  - affected directories：`workflow_platform/frontend/tests` 或人工验证文档
  - expected output：VM-B 引用 VM-A artifact，prediction/preview artifact id 一致。
  - verification method：日志中看到 `ImportTriDexelImage` 先于 `StartMachiningJob`，并能看到 field derivation 或明确 parser missing。
  - code change allowed：yes
  - runtime behavior：new path only

- [ ] T7.3 参数 patch + 几何 artifact 联动测试
  - purpose：验证工艺参数更新与几何输入不会脱节。
  - affected directories：`workflow_platform/frontend/tests` 或人工验证文档
  - expected output：上游 patch 改变后，下游 execution surface thickness 与 geometry artifact stale 关系清楚。
  - verification method：修改补偿/参数后 run all 和 run from selected 结果一致。
  - code change allowed：yes
  - runtime behavior：existing dataflow semantics must remain correct

## Deferred：后置任务

- [ ] D1 完整 STL / voxel / tri-dexel 通用 geometry contract。
- [ ] D2 后端 artifact store 或对象存储。
- [ ] D3 大体积 base64 snapshot 外置化。
- [ ] D4 文件几何读取的完整 UI 与解析。
- [ ] D5 后端 `/prediction/wall-error` 直接消费 tri-dexel / voxel。
- [ ] D6 多用户、长期实验数据库和权限系统。

## P8：Unity Preview Runtime 稳定性补充任务

本阶段由人工审查发现：VM3 / VM4 的 payload 审查虽然正确，但 Unity 场景恢复可能仍停留在 VM1，且该问题与 `Unity runtime warning recovered; preview runtime will reload on the next command`、`PlayerLoop internal function has been called recursively`、`table index is out of bounds` 等 warning/error 强绑定。

详细方案见：

- `openspec/changes/workflow-tridexel-geometry-dataflow/unity-preview-runtime-stability-plan.md`

新增后续任务：

- [x] U1. 增加 PreviewSession 状态机，避免 artifact / completed event 依赖隐式 active session。
- [x] U2. 增加 Unity command queue，串行化 `ImportTriDexelImage`、error cloud refresh、`StartMachiningJob` 等命令。
- [x] U3. Unity runtime warning 后将当前 preview session 标记为 invalidated，禁止捕获 fresh artifact。
- [x] U4. Preview 前记录 scene provenance 审查事件，明确 VM、upstream artifact、workpiece thickness、surface thickness 与 error cloud summary。
- [x] U5. 更新 Console 审查脚本，覆盖顺序 preview、非顺序 preview、runtime warning recover 三类场景。

本阶段不修改 Unity Build、不修改 `/prediction/wall-error`、不修改 WTC/ARPPL 后端、不重新定义 GeometryArtifact。