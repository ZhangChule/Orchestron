# 软件测试与状态报告

报告日期：2026-05-12

## 1. 测试对象

本报告面向当前 Orchestron 开发平台状态，覆盖：

- `workflow_platform` 公共工作流平台
- `virtual_machining_platform` 虚拟加工平台与壁厚误差预测服务
- `process_apps/wall-thickness-compensation` 壁厚误差补偿工艺 App
- `contracts` 跨模块契约

`process_apps/thinwall-dt` 当前仅作为历史一体化原型保留，不再作为工作流平台运行依赖。

## 2. 当前模块边界

- 工作流平台：节点编排、参数配置、运行调度、结果展示和 API 代理。
- 虚拟加工平台：Unity WebGL 包、虚拟加工节点、壁厚误差预测。
- 壁厚误差补偿 App：接收 `wall_error`，输出 `machining_compensation_plan`。
- 契约目录：维护定位位姿、补偿方案和 Unity bridge 的跨模块数据边界。

## 3. 已完成检查

### 3.1 工作流前端语法检查

```powershell
node --check workflow_platform/frontend/app.js
node --check workflow_platform/frontend/virtualMachiningWidget.js
```

结果：通过。

### 3.2 虚拟加工后端 Python 编译检查

```powershell
python -m compileall -q virtual_machining_platform\backend
```

结果：通过。

### 3.3 thinwall 依赖隔离检查

检查范围：

```text
workflow_platform
virtual_machining_platform
contracts
process_apps/wall-thickness-compensation
README.md
```

检查项：

```text
thinwall
Thinwall
thinwall_dt
/api/thinwall-dt
defaultThinwall
```

结果：工作流平台和新虚拟加工模块未发现对 `thinwall-dt` 的计算依赖。当前仅保留补偿工艺 `Open App` 临时入口 `http://localhost:18080/`。

### 3.4 壁厚误差预测数值一致性抽查

使用同一组样例参数，对比历史 `thinwall-dt` 预测服务与新 `virtual_machining_platform/backend` 预测服务：

```text
average_error = 0.028407338078869266
first_point_error = 0.02344525254640928
```

结果：两侧输出一致。此前工作流平台与独立 App 结果不一致的主要原因，是工作流前端曾使用临时前端公式；现已改为通过 `/api/virtual-machining/prediction/wall-error` 调用同一后端计算逻辑。

### 3.5 Docker 构建状态

`workflow-platform` 静态镜像构建逻辑已更新为从仓库根目录复制：

```text
workflow_platform/frontend
virtual_machining_platform/UnityBuild
```

完整 Compose 重建时，`virtual-machining-backend` 需要拉取 `python:3.12-slim`。当前本机验证受 Docker Hub 网络超时影响，未完成完整重建。该问题属于外部镜像拉取网络问题，不是项目文件结构错误。

## 4. 仍需联调的内容

- Unity WebGL 内部真实切削动画、材料去除效果和坐标系更新需要 Unity 包继续实现并与 bridge 联调。
- ARPPL 定位位姿到 Unity 加工坐标系的完整闭环需要结合真实工件数据回归。
- 浏览器端拖拽、连线、运行和 Unity 预览建议后续用 Playwright 建立端到端测试。
- 壁厚补偿 App 前端尚未完善，因此工作流里的 `Open App` 暂时仍指向历史原型端口 `18080`。

## 5. 结论

当前平台已经完成核心边界拆分：

```text
workflow_platform
  只做编排与展示

virtual_machining_platform
  承载 Unity 包和壁厚误差预测

process_apps/wall-thickness-compensation
  承载壁厚误差补偿工艺

process_apps/thinwall-dt
  作为历史原型保留
```

下一步应优先补充浏览器端回归测试和 Unity 侧真实切削预览验收，确保多节点工作流中的位姿、误差和补偿参数能持续一致地流动。
