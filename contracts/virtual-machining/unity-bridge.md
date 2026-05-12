# Unity Bridge Contract

工作流前端通过 Unity WebGL 的 `SendMessage` 与 Unity 包通信。

桥接对象名：

```text
FrontendBridge
```

当前 Unity 包已经支持或需要兼容的入口：

```text
LoadWorkpieceAndTool()
ResetToInitialScene()
StartMaterialRemovalPreview(jsonPayload)
```

建议后续 Unity 更新时保持稳定的入口：

```text
ApplyCoordinateTransform(jsonPayload)
ShowWallErrorField(jsonPayload)
ApplyCompensationPlan(jsonPayload)
```

如果 Unity 暂时只支持无参 `LoadWorkpieceAndTool()`，工作流平台会在调用前把当前虚拟加工节点场景参数暂存到：

```text
window.workflowVirtualMachiningScenePayload
```

Unity 侧可先从该全局对象读取工件、材料、刀具和工艺参数；后续可升级为显式支持 `LoadWorkpieceAndTool(jsonPayload)`。

## Wall Error Field

发送方法：

```text
ShowWallErrorField(jsonPayload)
```

Payload：

```json
{
  "type": "wall_error_field",
  "source": "workflow_platform",
  "points": [
    { "id": "K1_J1_I1", "x": 0, "y": 56, "z": 60, "stiffness": 1200, "error": 0.08 }
  ],
  "summary": {
    "point_count": 1,
    "min_error": 0.08,
    "max_error": 0.08,
    "average_error": 0.08
  }
}
```

用途：

```text
虚拟加工节点加载工件、材料、刀具和工艺参数
-> virtual_machining_platform 产生壁厚误差点
-> workflow_platform 输出 wall_error
-> Unity 控件接收 ShowWallErrorField 做误差场预览
```

## Material Removal Preview

发送方法：

```text
StartMaterialRemovalPreview(jsonPayload)
```

当前工作流平台按虚拟加工桥接契约发送 camelCase payload：

```json
{
  "workpiece": {
    "length": 120,
    "height": 56,
    "thickness": 3,
    "baseWidth": 64,
    "baseHeight": 16
  },
  "process": {
    "spindleSpeed": 7200,
    "feedRate": 48,
    "axialDepth": 10,
    "radialDepth": 1,
    "cuttingMode": "down_milling"
  },
  "points": [
    { "id": "K1_J1_I1", "x": 55, "y": 60, "z": 0, "stiffness": 1200, "error": 0.08 }
  ]
}
```

说明：`points` 会从壁厚误差结果映射到 Unity 切削预览坐标。坐标映射由工作流平台和 Unity bridge 共同约定；后续如坐标系变化，需要同步更新本文件。

## Coordinate Transform

发送方法：

```text
ApplyCoordinateTransform(jsonPayload)
```

消费契约：

```text
contracts/process-results/coordinate-transform.schema.json
```

用途：

```text
ARPPL 完成定位/配准
-> workflow_platform 记录位姿结果
-> Unity 控件接收 ApplyCoordinateTransform
-> Unity 更新加工坐标系
```

## Compensation Plan

发送方法：

```text
ApplyCompensationPlan(jsonPayload)
```

消费契约：

```text
contracts/process-results/machining-compensation-plan.schema.json
```

用途：

```text
壁厚补偿工艺生成补偿方案
-> workflow_platform 输出节点展示结果
-> Unity 控件接收补偿方案
-> Unity 预览补偿后的虚拟加工效果
```

## Compatibility

如果当前 Unity 包尚未实现 `ApplyCompensationPlan`，工作流前端可以继续使用兼容入口：

```text
StartMaterialRemovalPreview(jsonPayload)
```

等 Unity 包更新后，只需要调整 `workflow_platform/frontend/virtualMachiningWidget.js` 内的方法映射，不需要修改工艺 App 的计算逻辑。
