# Thinwall-DT Legacy Prototype

`thinwall-dt` 是薄壁件数字孪生一体化历史原型，保留了壁厚误差预测、补偿计算和 Unity WebGL 预览在同一个独立 App 中打通的早期路径。

在当前 Orchestron 模块化边界中，它只作为历史原型保留：

- 工作流平台不应调用 `thinwall-dt` 的内部 API 或后端代码。
- 虚拟加工节点的 Unity 包和壁厚误差预测已迁移到 `virtual_machining_platform/`。
- 壁厚误差补偿已迁移到 `process_apps/wall-thickness-compensation/`。
- 当前唯一临时例外是补偿工艺的 `Open App` 按钮仍打开 `http://localhost:18080/`，因为新的补偿 App 前端尚未完善。

## 目录结构

```text
process_apps/thinwall-dt/
  backend/             历史 FastAPI 服务
  frontend/            历史 React + Vite 界面
  docker/              独立部署入口
  docs/                历史开发文档
  README.md
```

## 独立 Docker 启动

如需查看历史原型：

```powershell
docker compose -f process_apps/thinwall-dt/docker/compose.yml up -d --build
```

访问：

```text
http://localhost:18080/
```

健康检查：

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:18080/health
Invoke-WebRequest -UseBasicParsing http://localhost:18080/api/thinwall-dt/health
```

## 后续约束

- 不在 `workflow_platform` 中新增对 `thinwall-dt` 的计算依赖。
- 不把新的虚拟加工能力继续沉淀到 `thinwall-dt` 中。
- Unity 打包更新进入 `virtual_machining_platform/UnityBuild/`。
- 壁厚误差预测更新进入 `virtual_machining_platform/backend/`。
- 壁厚误差补偿更新进入 `process_apps/wall-thickness-compensation/`。
- `docs/` 下历史文档可作为参考，但不代表当前工作流平台的模块边界。
