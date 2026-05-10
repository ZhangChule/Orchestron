# Unity WebGL 接口文档

本文档说明当前前端如何把壁厚误差、工件尺寸和加工参数一起发送给 Unity。

## 1. 通信方式

前端通过 Unity WebGL 的 `SendMessage` 调用 Unity 场景里的桥接对象。

桥接 GameObject 名固定为：

```text
FrontendBridge
```

前端调用方式：

```ts
unityInstance.SendMessage("FrontendBridge", methodName, jsonPayload);
```

代码位置：

```text
frontend/src/features/preview/UnityWebGLPreview.tsx
```

Unity 侧需要有名为 `FrontendBridge` 的 GameObject，并挂载包含对应 public 方法的脚本。

## 2. 当前 Unity 方法

| 前端命令 | Unity 方法名 | 参数 | 作用 |
| --- | --- | --- | --- |
| `LOAD_WORKPIECE_AND_TOOL` | `LoadWorkpieceAndTool` | 无 | 生成默认场景中的工件和刀具 |
| `START_MATERIAL_REMOVAL_PREVIEW` | `StartMaterialRemovalPreview` | JSON 字符串 | 开始材料去除预览，并接收壁厚误差、工件尺寸、加工参数 |
| `RESET_TO_INITIAL_SCENE` | `ResetToInitialScene` | 无 | 回到初始场景 |

## 3. 什么时候发送壁厚误差和加工信息

当前不是后端一返回误差就立刻发送给 Unity，而是在用户点击“开始切削过程预览”时发送。

流程：

1. 前端上传刚度矩阵。
2. 前端请求后端 `/prediction/wall-error`。
3. 后端返回 `x/y/z/stiffness/error`。
4. 前端把误差点写入 `keyPoints`。
5. 用户点击“开始切削过程预览”。
6. 前端打包：
   - 工件尺寸
   - 加工参数
   - 壁厚误差点
7. 前端调用：

```ts
SendMessage(
  "FrontendBridge",
  "StartMaterialRemovalPreview",
  JSON.stringify(payload)
)
```

打包逻辑位置：

```text
frontend/src/store/machiningStore.ts
```

相关函数：

```ts
buildUnityPreviewPayload()
runMaterialRemovalPreview()
```

## 4. StartMaterialRemovalPreview Payload

Unity 收到的是一个 JSON 字符串，解析后的结构如下：

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
    "spindleSpeed": 12000,
    "feedRate": 720,
    "axialDepth": 18,
    "radialDepth": 1.2,
    "cuttingMode": "up_milling"
  },
  "points": [
    {
      "id": "K1_J1_I1",
      "x": 0.3,
      "y": 56,
      "z": 0,
      "stiffness": 266.9039146,
      "error": 0.0123
    }
  ]
}
```

TypeScript 结构：

```ts
type MaterialRemovalPreviewPayload = {
  workpiece: {
    length: number;
    height: number;
    thickness: number;
    baseWidth: number;
    baseHeight: number;
  };
  process: {
    spindleSpeed: number;
    feedRate: number;
    axialDepth: number;
    radialDepth: number;
    cuttingMode: "up_milling" | "down_milling";
  };
  points: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    stiffness: number;
    error: number;
  }>;
};
```

## 5. 字段含义

### 5.1 工件尺寸

| JSON 字段 | 你的符号 | 单位 | 含义 |
| --- | --- | --- | --- |
| `workpiece.length` | `L` | mm | 工件长度 |
| `workpiece.height` | `H1` | mm | 工件总高 |
| `workpiece.thickness` | `t` | mm | 壁厚 |
| `workpiece.baseWidth` | `W` | mm | 底座宽 |
| `workpiece.baseHeight` | `H2` | mm | 底座高 |

### 5.2 加工参数

| JSON 字段 | 你的符号 | 单位 | 含义 |
| --- | --- | --- | --- |
| `process.spindleSpeed` | `n` | rpm | 主轴转速 |
| `process.feedRate` | `f` | mm/min | 进给速度 |
| `process.axialDepth` | `ap` | mm | 轴向切深 |
| `process.radialDepth` | `ae` | mm | 径向切深 |
| `process.cuttingMode` | 无 | 无 | 铣削方式，`up_milling` 或 `down_milling` |

### 5.3 误差点

| JSON 字段 | 单位 | 含义 |
| --- | --- | --- |
| `id` | 无 | 刚度测点 id，例如 `K1_J1_I1` |
| `x` | mm | Unity 坐标系下的 x |
| `y` | mm | Unity 坐标系下的 y |
| `z` | mm | Unity 坐标系下的 z |
| `stiffness` | N/mm | 该测点刚度 |
| `error` | mm | 后端计算得到的壁厚误差 |

## 6. 坐标变换规则

后端返回的是工件坐标：

```text
backend x, backend y, backend z
```

发送给 Unity 前，前端会做坐标变换：

```text
Unity x = backend y - ae
Unity y = backend z
Unity z = backend x
```

前端代码：

```ts
{
  id: point.id,
  x: point.y - process.radial_depth,
  y: point.z,
  z: point.x,
  stiffness: point.stiffness,
  error: point.error,
}
```

其中 `ae` 来自 payload 里的 `process.radialDepth`。因此 Unity 侧直接按收到的
`x/y/z` 使用，不需要再做坐标轴交换或额外减 `ae`。

## 7. Unity C# 接收示例

```csharp
using System;
using UnityEngine;

public class FrontendBridge : MonoBehaviour
{
    public void LoadWorkpieceAndTool()
    {
        // 加载工件和刀具
    }

    public void ResetToInitialScene()
    {
        // 清理场景并恢复初始状态
    }

    public void StartMaterialRemovalPreview(string json)
    {
        var payload = JsonUtility.FromJson<MaterialRemovalPreviewPayload>(json);

        WorkpiecePayload workpiece = payload.workpiece;
        ProcessPayload process = payload.process;
        ErrorPoint[] points = payload.points;

        // 在这里根据 workpiece/process/points 执行材料去除预览和壁厚误差映射
    }
}

[Serializable]
public class MaterialRemovalPreviewPayload
{
    public WorkpiecePayload workpiece;
    public ProcessPayload process;
    public ErrorPoint[] points;
}

[Serializable]
public class WorkpiecePayload
{
    public float length;
    public float height;
    public float thickness;
    public float baseWidth;
    public float baseHeight;
}

[Serializable]
public class ProcessPayload
{
    public float spindleSpeed;
    public float feedRate;
    public float axialDepth;
    public float radialDepth;
    public string cuttingMode;
}

[Serializable]
public class ErrorPoint
{
    public string id;
    public float x;
    public float y;
    public float z;
    public float stiffness;
    public float error;
}
```

## 8. Unity 回调前端

材料去除预览完成后，Unity 需要通过 jslib 触发浏览器事件：

```text
UnityMaterialRemovalPreviewCompleted
```

前端收到后会调用：

```ts
markMaterialRemovalPreviewCompleted()
```

然后任务流会把材料去除预览标记为完成，并允许进入壁厚误差补偿阶段。
