# Orchestron

Orchestron 是一个面向加工场景的可兼容、可编排、可扩展工作流平台。当前项目把能力拆成三类边界：

- `workflow_platform`：公共工作流平台，只负责节点编排、参数配置、运行调度、结果展示和 API 代理。
- `virtual_machining_platform`：虚拟加工平台，包含 Unity WebGL 打包产物和当前壁厚误差预测后端，作为工作流中的孪生节点使用。
- `process_apps/*`：可独立发布的工艺 App，例如 ARPPL 定位/配准和壁厚误差补偿。

重要约束：当前工作流平台不依赖 `process_apps/thinwall-dt` 的内部实现。`thinwall-dt` 只作为历史一体化原型保留；唯一临时例外是壁厚误差补偿节点的 `Open App` 按钮仍会打开 `http://localhost:18080/`，待补偿 App 前端完善后再切换到 `wall-thickness-compensation` 自身入口。

## 目录结构

```text
workflow_platform/
  frontend/        公共工作流前端、节点画布、内嵌 Unity 控件
  docker/          工作流平台 Nginx 镜像与 Compose 文件
  README.md

virtual_machining_platform/
  UnityBuild/      Unity WebGL 虚拟加工平台打包产物
  backend/         当前壁厚误差预测服务
  docker/          虚拟加工后端镜像文件
  README.md

process_apps/
  arppl/           ARPPL 定位/配准工艺 App
  wall-thickness-compensation/
                  壁厚误差补偿工艺 App
  thinwall-dt/     历史一体化原型，保留但不作为工作流依赖

contracts/
  process-results/ 工艺结果契约
  virtual-machining/
                  Unity WebGL 桥接契约

testcase/          本地测试数据，不进入 Git 与 Docker build context
```

## 从 GitHub 下载并部署

### 1. 准备环境

陌生设备至少需要：

- Git
- Docker Desktop 或 Docker Engine
- Docker Compose v2
- 可访问 GitHub 和 Docker Hub 的网络

确认命令：

```powershell
git --version
docker version
docker compose version
```

### 2. 克隆项目

```powershell
git clone https://github.com/ZhangChule/ARPPL.git
cd ARPPL
```

如果仓库目录名不是 `ARPPL`，进入实际克隆出的目录即可。

### 3. 启动公共工作流平台

```powershell
docker compose -f workflow_platform/docker/compose.yml up -d --build
```

该命令会启动：

- `workflow-platform`：Nginx 静态工作流前端，访问端口 `8080`
- `virtual-machining-backend`：虚拟加工壁厚误差预测后端，供 `/api/virtual-machining/*` 代理调用

访问：

```text
http://localhost:8080/
```

健康检查：

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8080/health
Invoke-WebRequest -UseBasicParsing http://localhost:8080/api/virtual-machining/health
```

Linux/macOS 可用：

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/virtual-machining/health
```

### 4. 按需启动工艺 App

运行壁厚误差补偿节点前，启动补偿 App：

```powershell
docker compose -f process_apps/wall-thickness-compensation/docker/compose.yml up -d --build
```

访问：

```text
http://localhost:18090/
```

运行 ARPPL 定位/配准节点前，启动 ARPPL App：

```powershell
docker compose -f process_apps/arppl/docker/compose.yml up -d --build
```

访问：

```text
http://localhost/
```

如果本机 `80` 端口已被占用，需要先释放端口或调整 `process_apps/arppl/docker/compose.yml` 的端口映射。

如需使用当前壁厚补偿节点的临时 `Open App` 入口，再启动历史原型：

```powershell
docker compose -f process_apps/thinwall-dt/docker/compose.yml up -d --build
```

访问：

```text
http://localhost:18080/
```

### 5. 调用示例

通过工作流平台代理调用虚拟加工壁厚误差预测：

```powershell
$body = @'
{
  "workpiece": {
    "length": 120,
    "height": 56,
    "thickness": 3,
    "base_width": 64,
    "base_height": 16
  },
  "material": {
    "name": "Al7075",
    "elasticModulus": "71.7 GPa",
    "poissonRatio": "0.33",
    "density": "2.81 g/cm3"
  },
  "tool": {
    "type": "flat_end_mill",
    "diameter": 10,
    "teeth": 4,
    "helix_angle": 35,
    "immersion_angle": 90,
    "cutter_length": 25,
    "overall_length": 75
  },
  "process": {
    "spindle_speed": 7200,
    "feed_rate": 48,
    "axial_depth": 10,
    "radial_depth": 1,
    "cutting_mode": "down_milling"
  },
  "key_points": [
    { "id": "K1_J1_I1", "stiffness": 1200 },
    { "id": "K1_J1_I2", "stiffness": 1500 }
  ],
  "model_version": "v1.0"
}
'@

Invoke-RestMethod `
  -Uri http://localhost:8080/api/virtual-machining/prediction/wall-error `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

通过工作流平台代理调用壁厚误差补偿：

```powershell
$body = @'
{
  "node_id": "wtc-demo",
  "trace_id": "manual-call",
  "payload": {
    "method": "stiffness_based",
    "radial_depth": 1,
    "model_version": "v1.0",
    "points": [
      { "id": "K1_J1_I1", "x": 0, "y": 56, "z": 60, "stiffness": 1200, "error": 0.08 },
      { "id": "K1_J1_I2", "x": 10, "y": 56, "z": 60, "stiffness": 1500, "error": 0.11 }
    ]
  }
}
'@

Invoke-RestMethod `
  -Uri http://localhost:8080/api/wall-thickness-compensation/workflow/run `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

## 当前工作流节点

### ARPPL

节点链：

```text
Input point clouds -> ARPPL registration -> Pose result
```

输入节点选择 `source` / `target` 点云文件；工艺节点配置 `u`、`alpha`、`Lower tol`、`Upper tol`、`max_outer`、`max_inner` 和采样比例；输出节点查看位姿矩阵、xyz、欧拉角和原始 JSON。

### Virtual Machining

节点链：

```text
Virtual machining parameters -> Wall error result
```

虚拟加工节点属于孪生节点，不属于工艺 App。它加载 `virtual_machining_platform/UnityBuild/` 中的 Unity WebGL 场景，并通过 `virtual_machining_platform/backend` 计算 `wall_error`。后续 Unity 更新时，优先替换 `virtual_machining_platform/UnityBuild/`，保持 `contracts/virtual-machining/unity-bridge.md` 中的桥接方法稳定。

### Wall Thickness Compensation

节点链：

```text
Wall error points -> Compensation process -> Compensation result
```

输入节点接收 `wall_error` 点 JSON；工艺节点配置补偿方法、径向切深和模型版本；输出节点查看补偿方案，并可将 `machining_compensation_plan` 发送到页面内嵌 Unity 控件做虚拟加工预览。

## 新增工艺 App 约定

推荐目录：

```text
process_apps/<process-id>/
  backend/
  frontend/
  docker/
  README.md
```

后端至少提供：

```text
GET  /health
GET  /workflow/manifest
POST /workflow/run
```

工作流平台不应直接依赖工艺 App 的内部计算函数。新增工艺时，先保证独立 App 可运行，再把 manifest 和 workflow API 注册到工作流平台的工艺库中。

## 常见问题

- `Failed to fetch`：通常是对应后端没有启动。先检查 `docker compose -f workflow_platform/docker/compose.yml ps`，再确认补偿 App 是否已启动在 `18090`。
- Docker 构建超时：当前虚拟加工后端镜像基于 `python:3.12-slim`，首次构建需要访问 Docker Hub。网络受限时可先执行 `docker pull python:3.12-slim` 和 `docker pull nginx:1.27-alpine`。
- Unity 切削预览不更新：先确认 `virtual_machining_platform/UnityBuild/` 是最新 Unity WebGL 包，再确认桥接方法与 `contracts/virtual-machining/unity-bridge.md` 一致。
