# 工艺微服务与公共工作流平台

本仓库用于管理“公共工作流平台”和多个可独立发布的工艺算法 App。平台负责发现、编排、配置和调度；每个工艺 App 负责自己的算法后端、独立界面、微前端模块和容器发布。

## 目录结构

```text
.
  workflow_platform/
    frontend/        公共工作流平台前端，图形化节点编排与结果查看
    docker/          公共平台的 Docker 启动文件
    README.md

  process_apps/
    arppl/
      backend/       FastAPI 微服务、算法 API、合同测试
      frontend/      ARPPL 独立 UI、ProcessLauncher、remoteEntry
      docker/        ARPPL 独立发布的 Dockerfile、Nginx、Compose
      README.md

    thinwall-dt/
      backend/       薄壁件数字孪生 FastAPI 工艺服务
      frontend/      Thinwall-DT 独立 React + Vite 界面
      docker/        Thinwall-DT 独立发布的 Dockerfile、Nginx、Compose
      README.md

  testcase/          本地真实测试数据，不复制进镜像
  GIT_DEVELOPMENT.md
  README.md
```

## 架构边界

公共平台不属于任何单个工艺 App。它通过 manifest 和 workflow API 调度工艺：

```text
GET  /api/<process-id>/workflow/manifest
POST /api/<process-id>/workflow/run
POST /api/<process-id>/workflow/run-files
```

工艺 App 必须保持独立发布能力。即使没有公共平台，单个工艺 App 也应能独立启动、独立打开 UI、独立上传数据并完成计算。

## 当前入口

启动 ARPPL 工艺 App：

```powershell
docker compose -f process_apps/arppl/docker/compose.yml up -d --no-build
```

访问 ARPPL 独立 App：

```text
http://localhost/
```

启动 Thinwall-DT 工艺 App：

```powershell
docker compose -f process_apps/thinwall-dt/docker/compose.yml up -d --build
```

访问 Thinwall-DT 独立 App：

```text
http://localhost:18080/
```

启动公共工作流平台：

```powershell
docker compose -f workflow_platform/docker/compose.yml up -d --build
```

访问公共平台：

```text
http://localhost:8080/
```

平台默认调度：

```text
http://localhost/api/process-a
```

## 工作流交互

公共平台目前提供一个图形化流程：

```text
Input -> ARPPL registration -> Pose result
```

画布中的节点可以拖拽移动。节点左右两侧的小圆点是连接端口：先点击上游节点的输出端口，再点击下游节点的输入端口，即可定义连接关系。默认流程为 `Input -> ARPPL registration -> Pose result`，也可以用 `Clear Links` 清空后重新连接。

你可以在平台画布中点击、双击或右键节点。`Configure node` 会根据节点类型打开不同弹窗：

- 输入节点：选择 `source` / `target` 点云文件，并设置 `visual pts` 默认值。
- 工艺节点：设置 ARPPL 参数和保存记录模式。
- 输出节点：查看配准后的位姿、矩阵、记录目录和原始输出。

平台会在输入弹窗中读取模型基础几何信息，包括格式、点数、是否包含法向以及包围盒。目标点云应包含法向信息 `nx/ny/nz`。除输入文件外，ARPPL 参数默认填好，也可以在工艺节点弹窗或右侧 Inspector 中调整：

- `u`
- `alpha`
- `Lower tol`
- `Upper tol`
- `max_outer`
- `max_inner`
- 配准采样比例：默认全采样，也可选择 `1/2` 或 `1/4`。平台会在提交时换算为后端已有的 `registration_sample_size`，不要求用户填写绝对点数。
- `visual pts`：只控制结果可视化点数，不改变 ARPPL 核心计算逻辑。

点击 `Run workflow` 后，平台会先校验画布连接关系。若已选择文件且勾选“保存结果到独立 App 记录”，平台调用 ARPPL 的 App API 并把结果写入独立 App 的记录区，便于在 ARPPL 完整界面中复核：

```text
POST /api/process-a/register-files
```

若关闭保存记录模式，平台调用无状态文件型 workflow API：

```text
POST /api/process-a/workflow/run-files
```

如果旧服务尚未提供 `workflow/run-files`，平台会回退到 `register-files`，保证默认文件型交互仍然可用。

如果独立 App 或 workflow 平台出现 `502 Bad Gateway`，通常是 gateway 容器缓存了旧 backend/frontend 容器 IP。当前 Nginx 已改为 Docker DNS 动态解析；修改配置后可执行：

```powershell
docker compose -f process_apps/arppl/docker/compose.yml restart gateway
```

如果没有选择文件，则使用内置 JSON 示例输入调用：

```text
POST /api/process-a/workflow/run
```

平台不会把矩阵和位姿常驻在画布上。运行完成后点击 `Pose result` 输出节点，在右侧 Inspector 查看：

- 4x4 位姿矩阵。
- 平移量 `x/y/z`。
- 欧拉角 `Rx/Ry/Rz`，单位为 degree。
- 独立 App 记录目录和记录文件。
- 原始 JSON 输出。

顶部语言控件支持中文/英文切换；它只影响界面文本，不改变 workflow 输入输出契约。

## 新增第二个工艺 App

新增工艺时按以下结构创建：

```text
process_apps/<new-process-id>/
  backend/
  frontend/
  docker/
  README.md
```

后端至少提供：

```text
GET  /health
GET  /workflow/v1/<new-process-id>/manifest
POST /workflow/v1/<new-process-id>/run
```

前端若需要被平台嵌入，至少暴露：

```text
<remote_name>/<ProcessApp>
<remote_name>/ProcessLauncher
<remote_name>/processManifest
```

Docker 要使用独立服务名、镜像名、volume 名和端口。多个工艺 App 同时在一台机器启动时，不要全部占用 `80:80`。

`thinwall-dt` 当前先作为独立工艺 App 管理，尚未接入公共 workflow 平台。它的独立容器入口为：

```powershell
docker compose -f process_apps/thinwall-dt/docker/compose.yml up -d --build
```

后续接入平台时，应在 `thinwall-dt` 后端新增 workflow 专用 API，而不是破坏现有独立界面和当前 `/prediction`、`/compensation` 接口。

## 验证命令

后端合同测试：

```powershell
python -m unittest process_apps.arppl.backend.test_process_contract -v
```

前端验证：

```powershell
cd process_apps/arppl/frontend
npm run lint
npm run build
```

Docker 配置检查：

```powershell
docker compose -f process_apps/arppl/docker/compose.yml config
docker compose -f process_apps/thinwall-dt/docker/compose.yml config
docker compose -f workflow_platform/docker/compose.yml config
```

如果 Docker Hub 网络不可用但本地已有镜像，可用 `--no-build` 启动工艺 App。
