# Unity 接口集成合并记录

## 基线保护

已将当前 `feat/orchestron-functionblock-workflow` 的 HEAD 推送到远端：

```text
origin/baseline/workflow-dataflow-alignment-v1
```

用途：作为合并前可恢复版本。

## 远端来源

远端仓库：

```text
https://github.com/ZhangChule/Orchestron.git
```

合并来源：

```text
origin/develop
```

## 为什么没有直接 merge

审查 `HEAD..origin/develop` 发现，`develop` 从较早基点演进，直接 merge 会删除当前分支已经建立的大量 workflow runtime、tests 和 OpenSpec 文档，并使 `workflow_platform/frontend/app.js` 大幅回退。

因此本次没有执行全量 merge，而是按 Unity 相关提交进行分阶段 cherry-pick。

## 已接入提交

```text
c6a406d 添加定位功能
a6c0c36 unity能跑多个工步
3566e43 更新了说明文件和运行数据
b083517 Unity更新接口
```

接入内容：

- `virtual_machining_platform/UnityBuild/Build/*.gz`
- `contracts/virtual-machining/unity0608版本.md`
- `process_apps/thinwall-dt/frontend/public/process1.txt`
- `process_apps/thinwall-dt/frontend/public/process2.txt`
- `process_apps/thinwall-dt/frontend/public/process3.txt`
- `process_apps/thinwall-dt/frontend/public/process4.txt`
- `process_apps/thinwall-dt/frontend/public/stiffness3.1.txt`
- `process_apps/thinwall-dt/frontend/public/stiffness3.2.txt`
- `process_apps/thinwall-dt/frontend/public/stiffness3.3.txt`
- `process_apps/thinwall-dt/frontend/public/stiffness3.4.txt`

## 协议判断

新版说明文件指出：

- 初始场景加载仍使用 `LoadWorkpieceAndTool()`；
- 加工入口变为 `StartMachiningJob(string json)`；
- 坐标映射为：

```text
Unity x = backend y - radialDepth
Unity y = backend z
Unity z = -backend x
```

- 新增 `ExportTriDexelImage()` 和 `ImportTriDexelImage(string base64)`；
- 前端监听 `UnityMachiningCompleted`，接收 `triDexelImageBase64`。

## Workflow 侧最小适配

新增：

```text
workflow_platform/frontend/runtime/unityPreviewAdapter.js
workflow_platform/frontend/tests/unityPreviewAdapter.test.mjs
```

作用：

- 从现有 Virtual Machining prediction request 和 wall-error points 生成新版 Unity `StartMachiningJob` payload；
- 增加 `toolpath`；
- 按新协议进行坐标映射；
- 保留 workflow execution core 不变；
- 不引入 geometry contract。

修改：

```text
workflow_platform/frontend/app.js
workflow_platform/frontend/virtualMachiningWidget.js
```

作用：

- `buildMaterialRemovalPreviewPayload()` 改为调用 `buildUnityMachiningJobPayload()`；
- `startMaterialRemovalPreview()` 作为前端内部兼容入口，实际发送 `StartMachiningJob`；
- 增加 `ImportTriDexelImage` / `ExportTriDexelImage` / `SetWorkpieceTransformMatrix` 方法映射；
- 监听 `UnityMachiningCompleted`，暂存 tri-dexel 返回数据，但不进入 geometry contract。

## 当前未完成项

- 还没有完整 preview session UI；
- 还没有把 `triDexelImageBase64` 纳入 WorkflowState / Artifact；
- 还没有实现 voxel / tri-dexel / geometry_artifact contract；
- 还没有手动 Docker + 浏览器 Unity smoke test。

## 验证

已运行：

```powershell
node --test workflow_platform/frontend/tests/*.mjs
node --check workflow_platform/frontend/app.js
node --check workflow_platform/frontend/virtualMachiningWidget.js
node --check workflow_platform/frontend/runtime/unityPreviewAdapter.js
```

结果：

```text
79 tests, 79 pass, 0 fail
语法检查通过
```
