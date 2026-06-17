# workflow-unity-interface-integration

## 背景

当前分支已经把 workflow 执行和数据流更新对齐到一个最小可验证状态：Virtual Machining 节点会冻结执行参数 base，WTC / parameter-update 会沿连线产生参数更新，snapshot 与 event log 可以解释节点结果版本。

另一个远端分支正在更新 Unity Build、Unity 调用接口、说明文件和运行数据。该分支开发者反馈：

1. 新版 Unity 对旧版兼容，理论上可以直接覆盖或调用新版 Unity Build；
2. 新版允许虚拟加工从“走刀级”扩展到“工步级”；
3. 使用方式应以说明文档 / 协议为依据，在不改变当前 workflow 框架、不改变新版 Unity Build 的前提下，调整本框架下的调用协议即可接入。

因此，本 change 的目标是为合并该远端 Unity 更新做准备并执行分阶段合并，而不是只停留在规划。

## 目标

- 在用户提供远端地址或分支名后，审查远端 Unity 分支与当前分支的差异。
- 区分 Unity Build、接口说明文件、运行数据、workflow 调用代码、geometry 相关内容。
- 保持当前 workflow 框架的执行语义不被重写。
- 将 Unity 接入边界固定为“可视化消费端”，而不是 workflow 数据流协议源头。
- 根据远端接口说明，设计并实现 workflow 侧最小调用协议适配。
- 分阶段合并新版 Unity Build / 说明文件 / 调用协议，确保现有 closed-loop demo 和 `/prediction/wall-error` 不被破坏。

## 范围

本 change 可以在后续 build 阶段涉及：

- `workflow_platform/frontend/**` 中 Unity payload / preview session / 调用适配相关代码；
- 当前 change 文档；
- 远端分支中明确属于 Unity Build 产物、Unity 接口说明、运行数据示例的文件；
- 必要时更新前端对 Unity 新接口的调用方式。

## 非目标

- 不修改 `virtual_machining_platform/backend` 的 `/prediction/wall-error` 接口和算法。
- 不修改 WTC / ARPPL 后端逻辑。
- 不重写 workflow execution core。
- 不引入完整 FunctionBlock / Job / Artifact 系统。
- 不抢先实现 STL / voxel / tri-dexel / geometry_artifact contract。
- 不把 Unity Build 改造成 workflow 数据流执行器。
- 不把新版 Unity 的内部协议直接扩散到整个 workflow 框架。

## 合并原则

本 change 的合并原则是“框架稳定，接口适配，分阶段验证”：

1. 先审查远端差异，不直接全量 merge；
2. 先合并或引用接口说明文件和运行数据示例；
3. 再合并 Unity Build 或静态资源；
4. 最后只在 workflow 侧新增或修改 Unity adapter / payload mapper；
5. geometry 相关问题只记录风险和边界，留给后续独立 change。

## 验收目标

- 能说明远端分支中哪些文件被合并、哪些文件暂缓、哪些文件只作为参考。
- 当前 closed-loop demo 仍可运行。
- 多个 Virtual Machining 节点仍能区分自己的 execution base、node result version 和 preview 输入。
- 新 Unity Build 可以通过说明文档定义的协议被 workflow 调用。
- workflow 自动运行和用户手动 preview 的边界清晰。
- 未引入 geometry contract 的提前设计。
