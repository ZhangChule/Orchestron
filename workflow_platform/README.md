# 公共工作流平台

`workflow_platform` 是 Orchestron 的公共编排前端，不属于任何单一工艺 App。它负责展示工艺库、配置节点、连接节点、运行 workflow API，并在页面内嵌入 Unity WebGL 虚拟加工控件。

当前画布支持两类节点：

- 工艺节点：来自 `process_apps/*`，每个工艺都应有独立前端、后端和部署环境。
- 孪生节点：当前为虚拟加工节点，由 `virtual_machining_platform` 提供 Unity WebGL 包和壁厚误差预测服务。

## 模块边界

- 工作流平台负责：节点编排、参数配置、运行调度、结果查看、结果向下游节点流动。
- 工艺 App 负责：独立后端、独立 UI、独立 Docker 发布、`/workflow/manifest` 和 `/workflow/run` 契约。
- 虚拟加工平台负责：Unity WebGL 场景、虚拟加工相关计算、壁厚误差预测和 Unity 桥接。
- `thinwall-dt` 只作为历史原型保留，工作流平台不得调用其内部 API 或代码。

当前唯一临时例外：壁厚误差补偿工艺的 `Open App` 按钮仍打开 `http://localhost:18080/`，因为补偿 App 前端尚未完成。该入口不参与工作流计算。

## 启动

从仓库根目录执行：

```powershell
docker compose -f workflow_platform/docker/compose.yml up -d --build
```

访问：

```text
http://localhost:8080/
```

健康检查：

```text
http://localhost:8080/health
http://localhost:8080/api/virtual-machining/health
```

该 Compose 会同时启动工作流前端和虚拟加工后端。壁厚误差补偿、ARPPL 等工艺 App 需要按需单独启动。

## API 代理

工作流平台容器内的 Nginx 负责代理当前工作流调用：

```text
/api/virtual-machining/*
  -> virtual-machining-backend:8000/*

/api/wall-thickness-compensation/*
  -> host.docker.internal:18090/api/wall-thickness-compensation/*
```

未知 `/api/*` 会返回 404，避免静态页面误返回给 API 调用。

## Unity 资源

工作流平台从以下路径加载 Unity WebGL：

```text
virtual_machining_platform/UnityBuild/
```

构建镜像时，该目录会被复制到容器内：

```text
/usr/share/nginx/html/virtual-machining/UnityBuild
```

前端桥接代码位于：

```text
workflow_platform/frontend/virtualMachiningWidget.js
```

后续 Unity 重新打包时，优先只替换 `virtual_machining_platform/UnityBuild/`。如需新增桥接能力，先更新 `contracts/virtual-machining/unity-bridge.md`，再调整 `virtualMachiningWidget.js` 的方法映射。

## 已接入节点

### ARPPL

- 类型：工艺节点
- 默认 API Base：`http://localhost/api/process-a`
- 输入：`source` / `target` 点云文件
- 参数：`u`、`alpha`、`Lower tol`、`Upper tol`、`max_outer`、`max_inner`、采样比例
- 输出：位姿矩阵、xyz、欧拉角、记录目录、原始 JSON

使用该节点前，需要启动：

```powershell
docker compose -f process_apps/arppl/docker/compose.yml up -d --build
```

### Virtual Machining

- 类型：孪生节点
- 默认 API Base：`/api/virtual-machining`
- 输入：工件尺寸、材料、刀具、主轴转速、进给、轴向/径向切深、刚度点
- 运行：调用 `virtual_machining_platform/backend` 的 `/prediction/wall-error`
- 输出：`wall_error`

`wall_error` 可以直接连接到壁厚误差补偿节点。建立连线后，平台会把上游误差点 JSON 自动补全到下游补偿输入中。

### Wall Thickness Compensation

- 类型：工艺节点
- 默认 API Base：`/api/wall-thickness-compensation`
- 当前临时独立 App 入口：`http://localhost:18080/`
- 输入：壁厚误差点 JSON
- 参数：补偿方法、径向切深、模型版本
- 输出：补偿建议、平均误差、`machining_compensation_plan`、原始 JSON

使用该节点前，需要启动：

```powershell
docker compose -f process_apps/wall-thickness-compensation/docker/compose.yml up -d --build
```

## 信息流动

单工艺节点可作为独立算法运行。例如只运行 ARPPL 时，输入扫描模型和理论模型，配置配准参数后输出位姿结果。

多节点工作流中，输出会向下游流动并更新对应参数。例如：

```text
ARPPL 定位配准 -> Virtual Machining 虚拟加工 -> Wall Thickness Compensation 误差补偿
```

理论上，ARPPL 输出的定位位姿应更新虚拟加工坐标系；虚拟加工在不同坐标系下预测壁厚误差；补偿工艺再根据误差输出下一次加工的补偿参数。当前代码已经具备节点结果传递和补偿输入补全能力，Unity 侧坐标系与切削效果联动仍需要后续 Unity 包继续实现和联调。

## 本地静态调试

推荐使用 Docker/Nginx 调试，因为它能正确设置 Unity `.gz` 资源的 `Content-Encoding`。如必须使用普通静态服务器，前端会在浏览器支持 `DecompressionStream` 时尝试自动解压 Unity 资源，但这只适合临时调试。
