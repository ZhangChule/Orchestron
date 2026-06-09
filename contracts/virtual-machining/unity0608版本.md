刚度还有走到信息都在`process_apps\thinwall-dt\frontend\public`下

第一次使用`LoadWorkpieceAndTool()`加载场景

现在的加工接口改为`StartMachiningJob(string json)`

对工件进行变换`SetWorkpieceTransformMatrix(string json)`

执行完一次后用`ExportTriDexelImage()`导出，前端接收json即可

下次使用`ImportTriDexelImage(string base64)`导入场景

`ResetToInitialScene()`可重置当前场景



# Start Machining Job

前端通过各种方式获取到需要的数据后，统一打包发送给unity，包括：

```json
{
  "workpiece": {
    "length": 120,
    "height": 55,
    "thickness": 6,
    "baseWidth": 120,
    "baseHeight": 15
  },
  "process": {
    "spindleSpeed": 5000,
    "feedRate": 64,
    "axialDepth": 10,
    "radialDepth": 1,
    "cuttingMode": "down_milling"
  },
  "points": [
    {
      "id": "K1_J1_I1",
      "x": 0,
      "y": 40,
      "z": 60,
      "stiffness": 266.9,
      "error": 0.012
    }
  ],
  "toolpath": {
    "coordinateSpace": "workpieceLocalMm",
    "start": { "x": 0, "y": 50, "z": -8 },
    "segments": [
      {
        "mode": "cut",
        "to": { "x": -54, "y": 30, "z": 128 },
        "speedMmPerSec": 15,
        "spindleRpm": 3000
      }
    ]
  }
}
```

误差点发送前执行坐标转换：

```
Unity x = backend y - radialDepth 
Unity y = backend z 
Unity z = -backend x
```

前端监听浏览器事件：

UnityMachiningCompleted

期望事件数据：

```
{  command?: string;  triDexelImageBase64?: string; }
```

其中真正使用的只有 triDexelImageBase64。前端会将它保存为当前工步的加工结果，并创建一个“工步 N 加工件”选项。



# 数据流转流程

系统当前固定创建四个工步，每个工步保存：

```
process 
toolpath 
status: pending/running/previewed/compensated 
triDexelImageBase64 
compensation
```

每次切削流程：

1. 导入当前工步刀轨。
2. 导入刚度矩阵。
3. 请求后端预测当前工步壁厚误差。
4. 发送 START_MACHINING_JOB 给 Unity。
5. Unity 返回 triDexelImageBase64。
6. 前端保存当前工步结果，并将工件厚度按 当前厚度 - radialDepth 更新。
7. 生成补偿建议，将工步标记为 compensated。
8. 进入下一工步。
9. 向 Unity 发送 IMPORT_TRIDEXEL_IMAGE，恢复上一工步加工后的实体。
10. 清除旧误差，使用下一工步刀轨重新预测和切削。