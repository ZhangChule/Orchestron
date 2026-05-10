# Thinwall-DT Process App

`thinwall-dt` 是薄壁件加工数字孪生工艺 App。它现在按 Orchestron 的工艺目录约定整理为一个可独立运行、独立构建、独立发布的 App；后续再单独处理它与公共 workflow 平台的 manifest、节点交互和数据契约。

## 目录结构

```text
process_apps/thinwall-dt/
  backend/             FastAPI 工艺服务
  frontend/            React + Vite 独立界面
  docker/              独立部署入口
  docs/                原始开发文档
  README.md            当前 App 运行说明
```

## 独立 Docker 启动

在项目根目录执行：

```powershell
docker compose -f process_apps/thinwall-dt/docker/compose.yml up -d --build
```

打开：

```text
http://localhost:18080/
```

健康检查：

```powershell
Invoke-WebRequest http://localhost:18080/health
Invoke-WebRequest http://localhost:18080/api/thinwall-dt/health
```

默认端口是 `18080`，用于避免和 ARPPL 独立 App 的 `80` 端口冲突。需要换端口时：

```powershell
$env:THINWALL_DT_HTTP_PORT="18081"
docker compose -f process_apps/thinwall-dt/docker/compose.yml up -d --build
```

停止服务：

```powershell
docker compose -f process_apps/thinwall-dt/docker/compose.yml down
```

## 本地开发启动

后端：

```powershell
cd process_apps/thinwall-dt/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

前端：

```powershell
cd process_apps/thinwall-dt/frontend
npm install
npm run dev
```

前端默认使用同源路径：

```text
/api/thinwall-dt
```

本地 Vite 开发服务器已配置代理，会把 `/api/thinwall-dt/*` 转发到 `http://127.0.0.1:8000/*`。如果需要强制直连后端，也可以在本机自行创建 `frontend/.env.development`：

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

因此独立容器运行时，浏览器只访问网关，后端不直接暴露到宿主机。

## 独立发布边界

当前 App 的独立发布入口是：

```text
process_apps/thinwall-dt/docker/compose.yml
```

它包含三个容器：

```text
thinwall-dt-backend   FastAPI 后端，内部端口 8000
thinwall-dt-frontend  Nginx 静态前端，内部端口 80
gateway               独立 App 网关，宿主机端口 18080
```

当前阶段暂不接入 workflow 平台。后续接入时，应新增独立的 workflow API 契约，而不是破坏现有独立 App 的接口和界面。
