# Wall Thickness Compensation Process App

`wall-thickness-compensation` 是独立壁厚误差补偿工艺 App。它只负责把壁厚误差点、刚度信息和加工参数转换为补偿方案，不加载 Unity，也不承担 workflow 编排。

当前补偿公式封装在本 App 内部。工作流平台只通过公开 API 和结果契约调用它。

## 边界

- 输入来源通常是虚拟加工节点输出的 `wall_error`。
- 输出是 `machining_compensation_plan`，契约见 `contracts/process-results/machining-compensation-plan.schema.json`。
- 壁厚误差预测不在本 App 内，归属 `virtual_machining_platform`。
- 当前独立前端尚未完善，因此工作流平台里的 `Open App` 临时打开历史原型 `http://localhost:18080/`。该临时入口不影响本 App 的 workflow API。

## 独立启动

从仓库根目录执行：

```powershell
docker compose -f process_apps/wall-thickness-compensation/docker/compose.yml up -d --build
```

访问：

```text
http://localhost:18090/
```

健康检查：

```text
http://localhost:18090/health
http://localhost:18090/api/wall-thickness-compensation/health
```

## API

独立 App API：

```text
POST /api/wall-thickness-compensation/compensation/suggest
```

Workflow API：

```text
GET  /api/wall-thickness-compensation/workflow/manifest
POST /api/wall-thickness-compensation/workflow/run
```

工作流平台启动后，也可以通过代理调用：

```text
http://localhost:8080/api/wall-thickness-compensation/workflow/run
```

## Workflow 输入

```json
{
  "node_id": "wtc-node",
  "trace_id": "trace-001",
  "payload": {
    "method": "stiffness_based",
    "radial_depth": 1,
    "model_version": "v1.0",
    "points": [
      { "id": "K1_J1_I1", "x": 0, "y": 56, "z": 60, "stiffness": 1200, "error": 0.08 }
    ]
  }
}
```

字段说明：

- `method`：`mirror`、`first_order` 或 `stiffness_based`
- `radial_depth`：当前径向切深
- `model_version`：模型版本标识
- `points`：壁厚误差点数组，每个点包含 `id/x/y/z/stiffness/error`

## 输出

- `suggestion_value`：建议补偿量
- `compensation_plan.delta_radial_depth`：写入跨模块契约的补偿量，不表示下一道径向切深
- `average_error`：平均误差
- `point_count`：参与计算点数
- `compensation_plan`：符合 `contracts/process-results/machining-compensation-plan.schema.json` 的补偿方案

该输出可被工作流平台展示，也可由页面内嵌 Unity 控件发送给虚拟加工平台做补偿后预览。
