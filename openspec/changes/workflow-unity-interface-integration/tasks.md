# 任务清单

## 范围约束

- 当前 change 目标是合并新版 Unity 接口与 Build，而不是只做规划。
- 远端地址或分支名将在下一次交互中提供；提供前不执行 fetch / merge / cherry-pick。
- 合并必须分阶段进行，不直接全量覆盖当前分支。
- 不修改 `/prediction/wall-error`。
- 不修改 WTC / ARPPL 后端。
- 不提前实现 voxel / tri-dexel / geometry_artifact contract。

## P0：远端输入与差异审查

- [x] P0.1 获取用户提供的远端地址、分支名或 PR。
  - 输出：远端来源记录。
  - 验证：能够 `git fetch` 或读取远端差异。

- [x] P0.2 生成远端差异清单。
  - 输出：`git diff --name-status` 和 `git diff --stat` 摘要。
  - 验证：文件按类别归档。

- [x] P0.3 文件分类。
  - 类别：
    - Unity Build / 静态资源；
    - Unity 接口说明文件；
    - 运行数据示例；
    - workflow 调用代码；
    - geometry / voxel / tri-dexel 相关内容；
    - 其他业务代码。
  - 输出：合并候选、暂缓候选、只读参考候选。

## P1：接口说明抽取

- [x] P1.1 阅读远端 Unity 接口说明文件。
  - 输出：新版 payload 字段清单。
  - 验证：字段来源可追溯到说明文件。

- [x] P1.2 区分旧版兼容字段和新版工步级字段。
  - 输出：兼容矩阵。
  - 验证：不依赖猜测字段。

- [x] P1.3 记录运行数据示例。
  - 输出：示例输入、示例输出、可用于 smoke test 的样例。
  - 验证：样例不进入 geometry contract 设计。

## P2：合并策略确认

- [x] P2.1 决定 Unity Build 文件的接入方式。
  - 选项：直接覆盖、并存版本、独立目录引用。
  - 输出：推荐方案和风险。

- [x] P2.2 决定接口说明文件的仓库位置。
  - 输出：文档接收路径。
  - 验证：不会覆盖当前 OpenSpec change 语义。

- [x] P2.3 决定 workflow 调用代码的修改范围。
  - 输出：允许修改文件清单。
  - 验证：不涉及后端算法。

## P3：分阶段合并

- [x] P3.1 合并接口说明文件和运行数据示例。
  - 验证：文档可读，样例可定位。

- [x] P3.2 合并或替换 Unity Build。
  - 验证：前端能加载 Unity。

- [x] P3.3 修改 workflow 侧 Unity adapter / payload mapper。
  - 验证：旧 payload 仍可生成，新 payload 可按说明文件生成。

- [x] P3.3a 增加 Virtual Machining 节点 toolpath 文件入口。
  - 验证：`.json/.txt` toolpath 可导入、校验、保存到节点配置，并传入 Unity machining payload。

- [x] P3.3b 增加新工件默认预设。
  - 预设：`L=120mm, H1=55mm, T=6mm, W=120mm, H2=15mm`。
  - 验证：虚拟加工节点配置界面可选择该预设，并填入几何参数。

- [x] P3.3c 修复 Preview Cutting Unity 入口。
  - 验证：workflow Docker 服务的 `virtual_machining_platform/UnityBuild` 使用 `FrontendBridge.StartMachiningJob`；历史 `StartMaterialRemovalPreview` 入口不再用于 workflow 手动切削预览。

- [x] P3.3d 增加 UnityBuild 静态资源 cache-busting。
  - 验证：`UnityBuild.loader.js`、`.data.gz`、`.framework.js.gz`、`.wasm.gz` 请求都带 `v=workflow-unity-interface-integration-v1`，避免浏览器 UnityCache/IndexedDB 继续使用旧 Build。

- [ ] P3.4 引入最小 preview session 记录。
  - 字段：
    - `preview_session_id`
    - `source_node_id`
    - `node_result_version_id`
    - `payload_schema_version`
    - `preview_level`
  - 验证：多 Virtual Machining 节点 preview 来源可区分。

## P4：验证

- [x] P4.1 运行现有 frontend tests。
  - 命令：`node --test workflow_platform/frontend/tests/*.mjs`
  - 期望：全部通过。

- [x] P4.2 检查 JS 语法。
  - 命令：
    - `node --check workflow_platform/frontend/app.js`
    - `node --check workflow_platform/frontend/runtime/*.js`
  - 期望：无语法错误。

- [ ] P4.3 手动验证 closed-loop demo。
  - 验证：
    - workflow 执行仍成功；
    - Virtual Machining execution base 正确；
    - Unity preview 可加载；
    - preview session 指向正确节点。

- [ ] P4.4 验证禁止事项。
  - 检查：
    - `/prediction/wall-error` 未改；
    - WTC / ARPPL 后端未改；
    - 未新增 geometry_artifact contract；
    - 未实现 voxel / tri-dexel contract。

## Deferred：后续独立 change

- [ ] D1. voxel / tri-dexel / geometry_artifact contract。
- [ ] D2. Unity preview UI/UX 全面整理。
- [ ] D3. preview history / session tree。
- [ ] D4. 工步级 workflow node model。
- [ ] D5. geometry 归档格式与计算格式转换追踪。
