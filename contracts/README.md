# Orchestron Contracts

`contracts/` 保存跨模块数据契约。它不属于某一个工艺 App，也不属于 Unity 项目，而是工作流平台、工艺 App 和虚拟加工平台之间的协作边界。

## 模块关系

```text
process_apps/*
  生产工艺计算结果

workflow_platform
  编排节点、运行工艺、记录结果、把结果传递给下游节点或 Unity 控件

virtual_machining_platform
  提供 Unity WebGL 包和虚拟加工壁厚误差预测服务
```

工艺 App 不直接调用 Unity 内部函数，Unity 也不直接调用工艺算法内部函数。二者通过 workflow 输出和本目录契约连接。

## 当前契约

```text
process-results/coordinate-transform.schema.json
  定位/配准工艺输出，用于更新虚拟加工坐标系。

process-results/machining-compensation-plan.schema.json
  壁厚误差补偿工艺输出，用于描述补偿量、误差摘要和后续验证所需信息。

virtual-machining/unity-bridge.md
  工作流前端与 Unity WebGL 包之间的 SendMessage 方法约定。
```

## 变更原则

- 新增字段优先设为可选，避免破坏已有工艺 App。
- 破坏性变更必须提升 `contract_version`。
- 字段含义、单位和坐标系必须写入契约文档。
- 不把某个 App 的内部类名或内部函数名写入跨模块契约。
