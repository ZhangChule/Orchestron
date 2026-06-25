# virtual-machining-thickness-error-field-semantics

## 背景

当前 Unity Build 的 `StartMachiningJob` payload 已经可以驱动虚拟加工可视化，先前云图不可见的问题已确认为坐标变换错误导致。下一阶段工作不再围绕 Unity Build 本身，而是回到壁厚误差场数据语义：追溯 workflow 前端传入虚拟加工后端的工艺参数，明确“执行径向切深”和“关键点刚度”如何进入壁厚误差计算，并在不改变误差计算核心逻辑的前提下，对输入前处理和输出后处理建立一致语义。

目前壁厚误差计算中，每个关键点的误差主要依赖两个输入：

- 执行径向切深；
- 关键点刚度。

其中关键点刚度来自刚度矩阵文件；执行径向切深当前在 workflow 中会被“误差补偿工艺节点 + parameter-update 逻辑节点”作为标量更新。这与薄壁件多关键点误差场的实际语义不完全一致：当前壁厚应当是一个场/矩阵，执行径向切深也应当按关键点形成矩阵，而不是仅作为一个全局标量。

## 目标

本 change 的目标是为 virtual machining 壁厚误差场建立清晰、可实现、可验证的数据语义，供后续 build 阶段按小任务实现。

具体目标：

- 明确后端当前代码中“执行径向切深”和“关键点刚度”的表达位置。
- 修正误差补偿建议值的符号语义：补偿建议值应与 `average_error` 同号，不再额外带负号。
- 在 workflow 前端概念层引入：
  - 设计加工面的壁厚；
  - 执行加工面的壁厚；
  - 当前壁厚；
  - 执行面壁厚误差；
  - 计算实际壁厚；
  - 设计面壁厚误差。
- 规划“执行径向切深”的输入前处理：由当前实际壁厚矩阵和执行加工面壁厚推导每个关键点的执行径向切深矩阵。
- 规划“计算误差”的输出后处理：由执行面壁厚误差推导计算实际壁厚与设计面壁厚误差，并将设计面壁厚误差作为 Unity payload 的误差场输入。
- 创建单独的人工查验文档，方便当前阶段手动检查数据链路。

## 非目标

本 change 不做以下事情：

- 不修改业务代码。
- 不修改 Unity Build。
- 不修改 `StartMachiningJob` 已验证可执行的基础 payload 结构。
- 不修改壁厚误差核心计算公式和求解逻辑。
- 不引入 voxel / tri-dexel / geometry artifact contract。
- 不立即实现“计算实际壁厚作为下一次虚拟加工当前壁厚”的完整闭环；该能力在本阶段之后单独推进。
- 不重构 workflow 执行器、FunctionBlock、Job/Event/Artifact 系统。

## 范围

涉及范围：

- `virtual_machining_platform/backend`：识别输入字段、计算入口、输出字段与可观测日志。
- `workflow_platform/frontend`：规划参数语义、前处理、后处理、Unity payload 输入来源。
- `process_apps/wall-thickness-compensation`：只分析补偿建议值符号与 workflow 参数更新关系，不改后端逻辑。
- `openspec/changes/virtual-machining-thickness-error-field-semantics`：记录设计、任务和人工查验方法。

不涉及范围：

- Unity Build 内部实现；
- WTC / ARPPL 后端算法；
- Docker 部署结构；
- 几何计算格式 contract。

## 预期结果

完成本 change 的 open/design 后，应能支持下一阶段 build 按小步实现：

1. 先修正补偿建议值符号和参数命名；
2. 再引入设计加工面壁厚、执行加工面壁厚、当前壁厚；
3. 再将执行径向切深从标量扩展为关键点矩阵；
4. 最后增加执行面误差到设计面误差的后处理，并保证 Unity payload 使用设计面壁厚误差。
