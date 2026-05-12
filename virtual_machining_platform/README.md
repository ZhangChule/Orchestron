# 虚拟加工平台

`virtual_machining_platform` 是当前工作流中的虚拟加工孪生模块。它独立于 `workflow_platform` 和各个 `process_apps`，后续 Unity 打包更新和虚拟加工误差预测更新都应优先在本目录内完成。

## 目录

```text
virtual_machining_platform/
  UnityBuild/              Unity WebGL 打包产物
  backend/                 壁厚误差预测 FastAPI 服务
  docker/backend.Dockerfile
  README.md
```

## 边界

- Unity WebGL 场景属于本模块，由 `UnityBuild/` 提供。
- 壁厚误差预测属于虚拟加工能力，由 `backend/` 提供。
- 壁厚误差补偿不属于本模块，位于 `process_apps/wall-thickness-compensation/`。
- 工作流平台只通过公开 API 和 Unity bridge 调用本模块，不导入内部 Python 或 Unity 代码。
- `process_apps/thinwall-dt` 是历史原型，不再作为虚拟加工节点的依赖来源。

## API

当前后端提供：

```text
GET  /health
POST /prediction/wall-error
```

请求示例：

```json
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
    { "id": "K1_J1_I1", "stiffness": 1200 }
  ],
  "model_version": "v1.0"
}
```

响应核心字段：

```text
points[]              壁厚误差点，包含 id/x/y/z/stiffness/error
summary.point_count
summary.min_error
summary.max_error
summary.average_error
model_version
```

## 在工作流平台中运行

推荐从仓库根目录启动工作流 Compose：

```powershell
docker compose -f workflow_platform/docker/compose.yml up -d --build
```

工作流平台通过 Nginx 暴露代理：

```text
http://localhost:8080/api/virtual-machining/health
http://localhost:8080/api/virtual-machining/prediction/wall-error
```

后端容器本身只在 Compose 网络内暴露 `8000`，默认不映射到宿主机端口。

## 本地后端开发

```powershell
cd virtual_machining_platform/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

本地直连地址：

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/prediction/wall-error
```

## Unity 更新约定

Unity 重新打包后，优先只替换：

```text
virtual_machining_platform/UnityBuild/
```

需要保持或同步更新：

- `UnityBuild.loader.js`
- `UnityBuild.data.gz`
- `UnityBuild.framework.js.gz`
- `UnityBuild.wasm.gz`
- `contracts/virtual-machining/unity-bridge.md`
- `workflow_platform/frontend/virtualMachiningWidget.js`

如果 Unity 侧新增方法，先在 bridge contract 中定义 payload，再由工作流前端发送命令。不要让工艺 App 直接调用 Unity 内部函数。
