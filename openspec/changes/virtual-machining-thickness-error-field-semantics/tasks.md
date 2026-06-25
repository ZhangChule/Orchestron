# 任务清单

## P0：只读确认与基线记录

- [ ] P0.1 记录当前 Unity payload 要求。
  - 目的：确认当前已可执行的 payload 字段、坐标变换和 `StartMachiningJob` 入口。
  - 涉及目录：`contracts/virtual-machining`、`workflow_platform/frontend`。
  - 输出：payload 字段表与当前代码位置。
  - 是否允许改代码：否。

- [ ] P0.2 追踪壁厚误差后端输入。
  - 目的：明确 `process.radial_depth` 和 `key_points[].stiffness` 在代码中的表达。
  - 涉及目录：`virtual_machining_platform/backend`。
  - 输出：输入字段、计算入口、日志观测点。
  - 是否允许改代码：否。

- [ ] P0.3 记录当前后端输出语义。
  - 目的：将当前 `points[].error` 标记为执行面壁厚误差。
  - 涉及目录：`virtual_machining_platform/backend`、`workflow_platform/frontend`。
  - 输出：后端 response 与 Unity payload 当前关系。
  - 是否允许改代码：否。

## P1：补偿值符号与参数语义

- [ ] P1.1 修正补偿建议值符号语义设计。
  - 目的：使补偿建议值与 `average_error` 同号。
  - 涉及目录：`process_apps/wall-thickness-compensation`、`workflow_platform/frontend`。
  - 输出：符号规则与影响点清单。
  - 是否允许改代码：进入 build 后允许。

- [ ] P1.2 梳理 `parameter-update add` 的含义。
  - 目的：避免把补偿值负号和 add 操作混在一起。
  - 涉及目录：`workflow_platform/frontend`。
  - 输出：参数更新规则。
  - 是否允许改代码：进入 build 后允许。

## P2：壁厚概念引入

- [ ] P2.1 定义设计加工面的壁厚。
  - 目的：在 workflow 前端形成统一字段 `design_surface_thickness`。
  - 涉及目录：`workflow_platform/frontend`。
  - 输出：字段位置、默认值、节点配置关系。
  - 是否允许改代码：进入 build 后允许。

- [ ] P2.2 定义执行加工面的壁厚。
  - 目的：形成 `execution_surface_thickness = design_surface_thickness - compensation_value`。
  - 涉及目录：`workflow_platform/frontend`。
  - 输出：前处理计算规则。
  - 是否允许改代码：进入 build 后允许。

- [ ] P2.3 定义当前壁厚场。
  - 目的：为后续矩阵化执行径向切深准备输入。
  - 涉及目录：`workflow_platform/frontend`。
  - 输出：`current_thickness_field` 的最小表达。
  - 是否允许改代码：进入 build 后允许。

## P3：执行径向切深前处理

- [ ] P3.1 设计执行径向切深矩阵。
  - 目的：将 `execution_radial_depth` 从标量概念扩展为每关键点矩阵。
  - 涉及目录：`workflow_platform/frontend`、`virtual_machining_platform/backend`。
  - 输出：矩阵字段、关键点对应规则。
  - 是否允许改代码：进入 build 后允许。

- [ ] P3.2 决定后端消费策略。
  - 目的：记录已确认的“先 A 后 C”策略。
  - A 阶段：使用平均执行径向切深作为后端兼容标量，不修改后端 schema。
  - C 阶段：扩展后端 schema 支持每关键点执行径向切深。
  - 非主线：不采用前端按关键点循环调用后端。
  - 输出：阶段边界、兼容策略和风险说明。
  - 是否允许改代码：进入 build 后按阶段允许。

## P4：误差后处理与 Unity 输入

- [ ] P4.1 增加执行面误差到实际壁厚的后处理。
  - 目的：计算 `computed_actual_thickness_field`。
  - 公式：`computed_actual_thickness = execution_surface_thickness + execution_surface_error`。
  - 涉及目录：`workflow_platform/frontend`。
  - 是否允许改代码：进入 build 后允许。

- [ ] P4.2 增加实际壁厚到设计面误差的后处理。
  - 目的：计算 `design_surface_error_field`。
  - 公式：`design_surface_error = computed_actual_thickness - design_surface_thickness`。
  - 涉及目录：`workflow_platform/frontend`。
  - 是否允许改代码：进入 build 后允许。

- [ ] P4.3 更新 Unity payload 输入来源。
  - 目的：让 `points[].error` 使用设计面壁厚误差。
  - 涉及目录：`workflow_platform/frontend/runtime/unityPreviewAdapter.js`。
  - 非目标：不修改 Unity Build。
  - 是否允许改代码：进入 build 后允许。

## P5：人工查验

- [ ] P5.1 编写并执行当前阶段人工查验。
  - 目的：手动检查输入前处理、后端输出、后处理、Unity payload 四段数据。
  - 文档：`manual-verification.md`。
  - 是否允许改代码：否。

- [ ] P5.2 记录后续 change 入口。
  - 目的：为“计算实际壁厚作为下一次虚拟加工当前壁厚”单独开启后续 change。
  - 输出：后续 change 建议名称和边界。
  - 是否允许改代码：否。

## Deferred：后置任务

- [ ] D1 将 `computed_actual_thickness_field` 作为下一次虚拟加工的 `current_thickness_field`。
- [ ] D2 引入完整多工步壁厚场传播。
- [ ] D3 引入 voxel / tri-dexel / geometry artifact contract。
- [ ] D4 扩展后端 schema 支持每关键点执行径向切深矩阵。
- [ ] D5 增加 Unity 侧多误差场调试显示。
