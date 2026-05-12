# ARPPL Process App

`process_apps/arppl` 是可独立发布的定位/配准工艺 App。公共工作流平台位于仓库根目录的 `workflow_platform`，不属于本工艺 App。

本 App 提供：

- 独立 React + Three.js 界面
- FastAPI 后端服务
- Docker Compose 独立部署
- 供工作流平台发现和调度的 manifest 与 headless run API

## 目录

```text
process_apps/arppl/
  backend/              FastAPI 服务、ARPPL API、测试脚本
  frontend/             React 独立界面
  docker/               Dockerfile、Nginx、Compose
  README.md
```

## 后端边界

核心数值计算逻辑位于 `backend/arppy.py` 的 `run_arppl` 及其依赖函数中。平台适配只应发生在 API 契约、manifest、文件输入输出、记录管理和容器部署层，不应随意改动 ARPPL 求解过程。

公开 API：

```text
GET  /api/process-a/workflow/manifest
POST /api/process-a/workflow/run
POST /api/process-a/workflow/run-files
POST /api/process-a/register-files
GET  /api/process-a/records
```

其中：

- App API 给独立 UI 使用，可保存本地实验记录。
- Workflow API 给工作流平台使用，默认应尽量保持无状态。

## 独立部署

从仓库根目录执行：

```powershell
docker compose -f process_apps/arppl/docker/compose.yml up -d --build
```

访问：

```text
http://localhost/                                  独立 App
http://localhost/health                            健康检查
http://localhost/api/process-a/workflow/manifest   工作流发现契约
```

如果本机 `80` 端口被占用，需要释放端口或调整 `docker/compose.yml` 的端口映射。

停止：

```powershell
docker compose -f process_apps/arppl/docker/compose.yml down
```

## 工作流平台调用

工作流平台默认使用：

```text
http://localhost/api/process-a
```

平台侧 ARPPL 节点会提交 `source` / `target` 点云文件，并将采样比例换算为后端已有的 `registration_sample_size` 参数。运行结果包括位姿矩阵、平移量、欧拉角、偏差统计和原始 JSON，可继续传给虚拟加工节点更新加工坐标系。

## 本地开发

后端：

```powershell
cd process_apps/arppl
python -m uvicorn backend.arppy:app --host 127.0.0.1 --port 8000
```

前端：

```powershell
cd process_apps/arppl/frontend
$env:VITE_API_BASE="http://127.0.0.1:8000/app/v1/process-a"
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

访问：

```text
http://127.0.0.1:5173/
```

## 测试

后端合同测试会使用仓库根目录下的真实 PLY 本地测试数据：

```powershell
cd process_apps/arppl
python -m unittest backend.test_process_contract -v
```

大数据回归脚本：

```powershell
python backend/run_output3_tests.py
```

这些测试依赖 `testcase/`。该目录是本地数据目录，不进入 Git 和 Docker build context，但保留在本机不会影响工作流平台运行。
