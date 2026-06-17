# 后续验证记录：刚度默认值、连线数据流与画布整理

## 本次修正目标

本次补充验证针对三个测试反馈：

1. 所有虚拟加工节点应默认采用 `D:\PhD\ARPPL_code\process_apps\thinwall-dt\frontend\public\stiffness.txt` 对应的六个刚度关键点。
2. WTC 与 LogicNode 读取上游结果时，应优先且严格按照 workflow 连线解析对应分支，不再静默读取全局最新结果。
3. `整理画布` 应把包含多阶段闭环 demo 的节点压缩排布到当前画布视野内，避免节点被排到不可见的远端位置。

## 验收口径

- 新建虚拟加工节点和 closed-loop demo 中的虚拟加工节点都应默认带有 6 个 key points。
- 默认刚度值应与 `stiffness.txt` 第一行一致：
  `266.9039146, 464.8856381, 543.6949509, 529.904264, 427.4478514, 213.8579983`。
- 浏览器前端不能直接读取本机 D 盘文件时，仍应通过内置默认 key points 保持 `/prediction/wall-error` 请求的六点输入。
- WTC 节点应从连线指定的上游 virtual machining 结果填充 `error_points`。
- `parameter-update` 等 LogicNode 应从连线指定的上游 compensation result 生成 patch。
- 多分支 demo 中，A 分支和 ALT 分支的补偿结果不应互相串用。
- `整理画布` 和 `Load Closed-loop Demo` 后，节点不应再保留 3000+ px 的横向排布。

## 当前不改变的边界

- 不修改 `/prediction/wall-error` 接口或响应。
- 不修改 Unity Build 或 Unity payload。
- 不修改 WTC / ARPPL 后端。
- 不引入完整 registry、FunctionBlock、Artifact 或 geometry contract。

## Run From Selected 补充语义

测试反馈：在 closed-loop demo 后追加 `WTC -> parameter-update -> VM` 后，直接选中最后的 VM 执行 `Run From Selected` 时，最后 VM 的 `radial_depth` 没有变化；但 `Run All` 正常变化。

根因：旧的 `Run From Selected` 只会因为上游结果 `stale` 才向上游展开。如果新追加的 WTC / parameter-update 从未执行过，它们没有 result version，也不会被判定为 stale，因此本次运行只执行最后 VM，导致 parameter patch 尚未生成。

修正后的最小语义：

- 如果选中节点存在上游 `stale` 可执行节点，则从这些 stale 节点向下游展开执行。
- 如果选中节点存在上游“尚未执行过”的可执行节点，也从这些节点向下游展开执行。
- 展开范围只覆盖“必要上游依赖 -> 选中节点”这条有向路径，不再自动继续执行选中节点之后的下游节点。
- 因此选中最后 VM 运行时，会先补跑必要的 WTC 和 parameter-update，再执行 VM，使 VM 冻结 base 时能够应用本轮新生成的 ParameterPatch。
- 事件日志中的 run_started 摘要改为 `expanded from upstream dependencies`，因为展开原因现在可能是 stale，也可能是未执行。

进一步测试反馈：如果 WTC / parameter-update 已经执行过且结果仍 fresh，选中下游 VM 再次 `Run From Selected` 时，参数仍可能没有变化。

根因：旧的 `ParameterPatch` 只有单个 `applied_to_base_version_id`。当 patch 已经应用过旧 VM base 后，后续 VM 重新冻结新的 base 时，该 patch 会被误判为“已经应用到另一个 base”并跳过。

修正后的 patch 幂等语义：

- `ParameterPatch` 增加 `applied_base_version_ids`，记录该 patch 已应用过的 base 列表。
- 同一个 patch 对同一个 base 仍只应用一次，防止重复叠加。
- 同一个 fresh patch 可以应用到新的下游 VM base，使“复用已有 fresh 上游结果并运行到选中节点”时仍能更新工艺参数。

## ParameterPatch 简化调整

进一步复盘后，`ParameterPatch` 不再承担“已应用到哪些 base”的运行状态。

最终约定：

- `ParameterPatch` 只表达不可变的参数修改意图：
  - `patch_id`
  - `source_result_ref`
  - `target_path`
  - `operation`
  - `value`
  - `created_by_node_id`
  - `target_virtual_node_ids`
- `ProcessParameterBaseVersion.source_patch_ids` 记录某个 VM base 实际应用了哪些 patch。
- `ExecutionEvent` 记录 `parameter_patch_applied` / `parameter_patch_skipped`，解释本次运行为什么应用或跳过某个 patch。
- 不再在 patch 自身保存 `applied_to_base_version_id`、`applied_base_version_ids`、`target_base_version_id`。

这样可以避免 patch 同时扮演“参数修改意图”和“运行状态记录”两个角色。

注：上方早期记录中提到的 `applied_base_version_ids` 是临时修正思路，已被本节的最终简化约定取代。

## ParameterPatch 重跑叠加修正

测试反馈：修改某个 WTC 的 `compensation method` 后，对后续 VM 执行 `Run From Selected`，VM 的径向切深会在上一轮 event log 已记录过的更新结果上进一步叠加。

根因：`ParameterPatch` 历史列表会保留同一个 `parameter-update` 节点多次运行产生的 patch。旧逻辑在冻结 VM base 时遍历全部历史 patch，只检查“是否已经应用到同一个 base”，没有判断“同一更新节点的旧 patch 是否已被新 patch 取代”。因此当 WTC 方法变化后，同一个 `parameter-update` 节点会产生新的 patch，但旧 patch 仍会和新 patch 一起应用到新的 VM base，导致径向切深重复叠加。

本次修正规则：

- `ParameterPatch` 仍作为不可变历史记录保留，不删除旧 patch。
- 对当前 VM base 计算“可生效 patch 集”时，同一个 `created_by_node_id` 与同一个 `target_path` 只允许最新 patch 生效。
- 被取代的旧 patch 记录 `parameter_patch_skipped` 事件，`skip_reason` 为 `patch superseded by newer patch from same update node`。
- 不同 `parameter-update` 节点产生的 patch 仍可叠加，用于表达多道工艺节点对同一参数的连续修改。
- VM base 的 `source_patch_ids` 只记录本次实际应用的最新 patch，避免旧更新静默进入新的参数 base。

验收重点：

- 旧 patch 与新 patch 同时存在于 snapshot / event log 中，但旧 patch 不再参与当前 VM base 参数计算。
- 修改 WTC 方法并重跑到下游 VM 时，径向切深应从 VM base 加上本轮最新补偿值，而不是叠加上一轮补偿值。
- event log 应能解释旧 patch 为什么被跳过，以及新 patch 应用到了哪个 VM base。

## Run All 中跨 VC 参数叠加修正

测试反馈：重新定义一组 workflow 后，`Run All` 中仍出现参数叠加。某次 VC 的 base version 设置为 `radial_depth = 1.0mm`，其上游 WTC 补偿 delta 为 `-0.0911mm`，期望结果应为约 `0.9089mm`。实际冻结出的 VC base 为约 `0.8107mm`，等价于从上一轮 VC 的 `0.9018mm` 再叠加 `-0.0911mm`。

对 snapshot 的只读排查结果：

- `virtual-machining-2` 的 base 为 `0.9018067321907839`，来源 patch 为 `parameter-update-6 = -0.09819326780921608`。
- `virtual-machining-17` 的 base 为 `0.8107058898089667`，source patches 同时包含：
  - `parameter-update-6 = -0.09819326780921608`
  - `parameter-update-16 = -0.09110084238181718`
- 但 workflow 连线中 `parameter-update-6` 只直接连接到 `virtual-machining-2`，并没有直接连接到 `virtual-machining-17`。

根因：`parameter-update` 生成 patch target 时，旧逻辑会收集“所有可达的下游 VC”。这会让上游 patch 穿过已经形成独立 base 边界的 VC，继续污染更远处的 VC。该行为不符合“每个 VC 在参数设置上应当是独立的，参数流动必须由显式更新节点控制”的语义。

本次修正规则：

- `parameter-update` 仍可通过连线寻找下游 VC 作为 patch target。
- 但每条路径只允许寻找“第一层可达 VC”。
- 一旦路径遇到某个 VC，就把该 VC 作为 patch target，并停止继续向后遍历。
- 因此 patch 不会跨过 `virtual-machining-2` 继续传播到 `virtual-machining-17`。
- 如果后续 VC 需要参数更新，必须由它自己上游路径上的 `parameter-update` 显式生成 patch。

对应验收：

- `parameter-update-6 -> virtual-machining-2 -> ... -> parameter-update-16 -> virtual-machining-17` 时，`parameter-update-6` 的 target 只能是 `virtual-machining-2`。
- `virtual-machining-17` 的 base 应从自己的 VC base `1.0mm` 加上 `parameter-update-16` 的 delta 计算，而不是继承 `virtual-machining-2` 的已补偿结果。

## Run All 跨 VC 叠加的二次修正

进一步测试反馈：即使修改了 `parameter-update` 新 patch 的 target 生成规则，完整 workflow `Run All` 中仍可能出现 `0.8107mm`。在最后一次 WTC 后新增支线并对该支线 VC 执行 `Run From Selected` 时，结果为正确的 `0.9089mm`；但再次 `Run All` 后，该支线又变成 `0.8107mm`。

对新 snapshot 的只读排查结果：

- `parameter-update-5` 生成的历史 patch 仍声明 targets 为 `virtual-machining-3`、`virtual-machining-11`、`virtual-machining-13`。
- 当前 graph 中 `parameter-update-5` 的第一层下游 VC 实际只有 `virtual-machining-3`。
- `virtual-machining-11` 和后续支线 VC 是另一个 VC base 之后的新阶段，不应再继承 `parameter-update-5`。

因此，仅在 patch 创建时修正 target 不够；如果旧 snapshot、旧运行态或缓存中已经保存了过宽 target，VM 冻结 base 时仍会应用这些历史 patch。

本次新增防御规则：

- 冻结某个 VC 的 `ProcessParameterBaseVersion` 时，`applyPendingPatchesToCandidateParameters` 会在有 graph context 的情况下重新校验 patch 边界。
- 对于带 `created_by_node_id` 的 patch，从该创建节点沿当前连线寻找第一层下游 VC。
- 如果当前正在冻结的 VC 不属于这批第一层 VC，说明该 patch 需要跨过另一个 VC base 才能到达当前节点，应跳过。
- 跳过事件记录为 `parameter_patch_skipped`，`skip_reason` 为 `patch crosses another virtual machining base boundary`。

这样即使历史 patch 的 `target_virtual_node_ids` 已经过宽，新的 VM base freeze 仍会按当前 workflow graph 拦截跨 VC 传播。

## Complex Closed-loop Demo 更新

为覆盖上述场景，Closed-loop demo 调整为更接近当前测试方法的复杂链路：

```text
VM baseline
-> condition A
-> WTC A
-> parameter-update A
-> VM pass 1
-> condition B
-> WTC B
   -> parameter-update B main
   -> VM pass 2 main
   -> stop
   -> parameter-update B branch
   -> VM pass 2 branch
```

验收重点：

- `parameter-update A` 只应影响 `VM pass 1`。
- `parameter-update A` 不应穿过 `VM pass 1` 继续影响 `VM pass 2 main` 或 `VM pass 2 branch`。
- `parameter-update B main` 与 `parameter-update B branch` 分别作用到各自 VC。
- 两条最后支线都应以各自 VC 的 base `radial_depth = 1.0mm` 加本阶段 WTC delta 为准。

## 自动运行污染 VC 设计 base 的根因修正

进一步测试反馈：最新 snapshot 中 patch target 和 skip event 已经正确，但后续 VC 的 base 仍然不是用户设计的 `1.0mm`。

只读排查结果：

- `parameter-update` 的 patch 已经只指向各自下游 VC；
- 跨 VC patch 已经被 `patch crosses another virtual machining base boundary` 跳过；
- 但节点自身的 `processParameterBase` 已经被写成运行态结果，例如：
  - `virtual-machining-5.processParameterBase.radial_depth = 0.9177089990462443`
  - `virtual-machining-9.processParameterBase.radial_depth = 0.9162943490996237`
  - `virtual-machining-12.processParameterBase.radial_depth = 0.9162943490996237`

这说明更深层的问题不是 patch 选择，而是 workflow 自动执行期间把补偿后的运行态参数写回了画布节点 `node.params.process`。随后导出 snapshot、重置 run state 或再次捕获 base 时，这些运行态参数会被误认为用户设计的 VC base。

本次修正规则：

- workflow 自动执行 VM 时，不再直接对画布节点调用运行态参数应用。
- 自动执行会先克隆一个 runtime virtual node；
- runtime node 使用当前 `WorkflowState` 中冻结后的 base/patch 参数调用 `/prediction/wall-error` 和生成 Unity payload；
- 执行完成后，只把 `data`、`lastResponse`、`virtualSceneReady` 回写到画布节点；
- 不回写 `params.process`，不回写 `processParameterBase`。

这样：

- 画布节点保留用户设计的 base；
- `Run All` 不会把上一轮补偿结果变成下一轮设计 base；
- snapshot 中的 VC `params.process` / `processParameterBase` 应保持用户配置值；
- 每个 VC 的运行态参数只应出现在 `parameter_base_versions[].parameters` 和事件日志中。
