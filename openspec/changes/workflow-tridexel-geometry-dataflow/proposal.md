# workflow-tridexel-geometry-dataflow

## 本 Change 的定位

本 change 是后续实现 tri-dexel 几何数据流、虚拟加工节点厚度场传递、以及 VM Inspector 字段修正的当前约束来源。

历史 change `virtual-machining-thickness-error-field-semantics` 可作为背景参考；如果其中关于“过渡方案”“计算侧与可视化侧分离”“每个 VM 必须保留独立理想参数化几何 base”“Design/Execution radial depth 标量显示”等表述与本 change 冲突，以本 change 为准。

## 背景

根据 `contracts/virtual-machining/unity0608版本.md` 以及与 Unity 开发人员的沟通，当前 Unity Build 已支持成熟的 tri-dexel 几何状态接口：

- `ExportTriDexelImage()`：导出当前加工后的 tri-dexel 几何状态；
- `ImportTriDexelImage(base64)`：恢复 Unity 场景中的加工后实体；
- `StartMachiningJob(payload)`：在当前 Unity 场景实体上继续执行当前节点的加工可视化；
- `UnityMachiningCompleted`：Unity 执行完成后返回 `triDexelImageBase64`。

这意味着 `triDexelImageBase64` 不应再被理解为临时 preview 状态，而应被纳入 workflow 的几何数据流。上游 Virtual Machining 节点生成的 tri-dexel 几何状态，应能被下游 Virtual Machining 节点读取、恢复、参与后续预测与可视化。

当前缺口是：workflow 还没有稳定表达、命名、引用、snapshot、stale 管理这类几何产物；同时后端壁厚误差预测需要的 `current_thickness_field` 还缺少从 tri-dexel 几何状态派生的明确函数边界。

## 目标

1. 定义最小 `GeometryArtifact` / `TriDexelGeometryArtifact` 语义，用于保存、命名、引用和恢复 `triDexelImageBase64`。
2. 让 Virtual Machining 节点支持明确的工件几何输入来源：
   - 参数化几何：由尺寸对象定义初始工件；
   - 文件几何：保留边界，后续接入；
   - 上游节点几何：读取上游 Virtual Machining 节点生成的 tri-dexel artifact。
3. 定义从 `triDexelImageBase64` 派生 `current_thickness_field` 的函数边界，使其服务于虚拟加工后端壁厚误差预测。
4. 明确新的厚度语义：
   - `design_surface_thickness`：设计加工面的壁厚，标量，由 VM 节点 config 交互定义，属于工艺参数 base；
   - `execution_surface_thickness`：执行加工面的壁厚，标量，由 workflow 运行时根据补偿/参数 patch 得到；
   - `current_thickness_field`：当前实际壁厚场，矩阵/场；
   - `execution_radial_depth_field = current_thickness_field - execution_surface_thickness`，矩阵/场，不是标量。
5. 修正 VM Inspector 表达，取消或降级 `Design radial depth` / `Execution radial depth` 标量显示，改为显示 surface thickness 与 thickness field 摘要。
6. 让 snapshot、event log、node result version、stale propagation 能解释几何 artifact 与节点执行之间的关系。
7. 保持现有 Unity Build、`/prediction/wall-error` 接口、workflow execution core、参数 base/patch 机制的兼容性。

## 非目标

- 不修改 Unity Build。
- 不抢先设计完整 STL / voxel / tri-dexel 通用 geometry contract。
- 不引入后端数据库或 artifact store。
- 不重做 workflow UI。
- 不改写现有 workflow execution core。
- 不破坏现有参数 base / patch / result version 语义。
- 不改变旧 workflow 默认使用参数化几何运行的行为。
- 不在没有协议事实的情况下伪造 `triDexelImageBase64 -> current_thickness_field` 解析结果。

## 关键决策

1. `triDexelImageBase64` 是当前阶段几何状态传递的正式前端表达。
2. 下游 VM 选择 `upstream_node` 几何来源时，上游 tri-dexel artifact 是当前几何输入；本节点的参数化尺寸只能作为默认、fallback 或 UI 辅助，不能覆盖上游几何状态。
3. Unity preview 与后端 prediction 必须围绕同一个 `geometry_artifact_id` 对齐。
4. 如果当前实现无法从 tri-dexel 数据派生 `current_thickness_field`，应明确阻止依赖该字段的下游 prediction，并报告 `tri_dexel_thickness_parser_missing`，而不是静默使用旧参数化厚度。
5. VM Inspector 不再把执行径向切深显示为标量；执行径向切深是按关键点变化的 field。
6. 本 change 下的 proposal/design/tasks 是后续 build 的执行顺序来源，避免跨 change 查漏补缺。

## 验收标准

- 上游 VM 执行完成后，workflow state 中可看到对应 `GeometryArtifact`。
- artifact 记录包含来源节点、来源 result version、来源 visualization session、run id、summary、stale 状态。
- 下游 VM 可配置为读取上游 VM 的 tri-dexel artifact。
- 下游 VM preview 前先执行 `ImportTriDexelImage(base64)`，再执行 `StartMachiningJob(payload)`。
- 下游 VM prediction 与 preview 引用同一个 `geometry_artifact_id`。
- snapshot 导出/导入能恢复 geometry artifacts 与节点引用关系。
- 上游 VM 配置、toolpath、stiffness、参数 patch 或 geometry artifact 变化时，下游引用结果会 stale 或阻止错误继续执行。
- VM Inspector 显示 `design_surface_thickness`、`execution_surface_thickness`、`current_thickness_field` 摘要与 `execution_radial_depth_field` 摘要。
- 旧 workflow 和旧 snapshot 不因缺少 `geometry_artifacts` 字段失败。
