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
- `startMaterialRemovalPreview()` 作为前端内部兼容入口，实际发送 workflow Docker 当前服务的 `StartMachiningJob`；
- `StartMaterialRemovalPreview` 只作为历史 thinwall-dt 原型入口参考，不再用于 workflow 手动切削预览；
- 增加 `ImportTriDexelImage` / `ExportTriDexelImage` / `SetWorkpieceTransformMatrix` 方法映射；
- 同时监听 `UnityMachiningCompleted` 和 `UnityMaterialRemovalPreviewCompleted`，暂存 tri-dexel 返回数据，但不进入 geometry contract。

## 当前未完成项

- 还没有完整 preview session UI；
- 还没有把 `triDexelImageBase64` 纳入 WorkflowState / Artifact；
- 还没有实现 voxel / tri-dexel / geometry_artifact contract；
- 还没有完成多节点 preview session UI/UX 设计落地。

## 后续补充：toolpath 文件入口与新工件预设

为便于测试新版 `StartMachiningJob`，已在 Virtual Machining 节点配置中增加：

- 工艺参数页的 `Import toolpath` 文件入口；
- 可编辑的 `Toolpath JSON`；
- 新工件预设：

```text
L=120mm
H1=55mm
T=6mm
W=120mm
H2=15mm
```

toolpath 文件会被解析为 Unity 说明文件中的 `toolpath` 结构，并随 Virtual Machining 节点的 Unity payload 传入。未导入 toolpath 时继续使用默认轨迹。

## Preview Cutting 兼容修复

用户在 operation demo 工件、`stiffness3.1.txt` 和 `process1.txt` 下执行 `Preview Cutting` 后看到 `Maximum call stack size exceeded`。检查发现 workflow Docker 实际服务的是 `virtual_machining_platform/UnityBuild`，该包包含新版 `StartMachiningJob`；改用历史 `StartMaterialRemovalPreview` 入口会进入 Unity wasm 侧并触发栈溢出。

修复策略：

- 不修改 Unity Build；
- 不修改 workflow execution core；
- 不修改 `/prediction/wall-error`；
- 手动 `Preview Cutting` 发送 `FrontendBridge.StartMachiningJob`；
- `StartMaterialRemovalPreview` 不再作为 workflow 手动 preview 的发送入口；
- Unity 完成事件同时兼容 `UnityMachiningCompleted` 与 `UnityMaterialRemovalPreviewCompleted`。

## UnityCache / IndexedDB 缓存处理

在全新浏览器 profile 下执行单 Virtual Machining 节点 smoke test 时，operation demo 工件、`stiffness3.1.txt` 和 `process1.txt` 能正常触发 `StartMachiningJob`，Unity console 输出 `[FrontendBridge] Machining job started.`，没有 `Maximum call stack size exceeded`。

这说明用户浏览器继续报栈溢出时，很可能仍在复用旧 Unity WebGL 缓存。为避免 rebuild 后仍加载旧 Build，workflow widget 对以下资源追加固定版本参数：

```text
UnityBuild.loader.js?v=workflow-unity-interface-integration-v1
UnityBuild.data.gz?v=workflow-unity-interface-integration-v1
UnityBuild.framework.js.gz?v=workflow-unity-interface-integration-v1
UnityBuild.wasm.gz?v=workflow-unity-interface-integration-v1
```

真实 smoke test 结果：

```text
Run all: 执行成功
Preview Cutting: SendMessage FrontendBridge.StartMachiningJob
Unity status: Unity ready
Console: no RangeError captured
Canvas: Unity scene visible with workpiece and cutter
```

## 验证

已运行：

```powershell
node --test workflow_platform/frontend/tests/*.mjs
node --check workflow_platform/frontend/app.js
node --check workflow_platform/frontend/virtualMachiningWidget.js
node --check workflow_platform/frontend/runtime/unityPreviewAdapter.js
node --check workflow_platform/frontend/runtime/virtualMachiningNodeConfig.js
node --test workflow_platform/frontend/tests/virtualMachiningWidget.test.mjs
```

结果：

```text
86 tests, 86 pass, 0 fail
语法检查通过
```
