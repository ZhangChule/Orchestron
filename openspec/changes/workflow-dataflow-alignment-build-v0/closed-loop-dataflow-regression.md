# Closed-loop 数据流回归验证记录

## 本轮修复与验证目标

本轮重新对 closed-loop demo 做系统回归，覆盖用户要求的三类测试：

1. `run all` 后，检查每个 Virtual Machining 节点的 `radial_depth` 是否按当前数据流正确更新；
2. 修改上游节点配置，例如 WTC 的 `compensation method`，分别测试主线和支线的 `run workflow` / `run from selected`；
3. 在 demo 工作流基础上增加工艺调试支线，包含逻辑节点、虚拟加工节点、工艺节点，再测试 `run workflow` / `run from selected`。

本轮额外修复了一个可观察性问题：页面 Inspector 之前显示的是 Virtual Machining 节点的设计参数 `node.params.process.radial_depth`，而不是执行时冻结的 `ProcessParameterBaseVersion.parameters.radial_depth`。因此用户会看到“节点参数没有更新”。现在 Inspector、节点卡片和 Console 都暴露执行参数视图。

## 参数语义

每个 Virtual Machining 节点有两类参数：

| 参数层 | 含义 | 是否应被 parameter-update 改写 |
| --- | --- | --- |
| Design base | 节点自身配置，例如 Inspector 配置框中的 `1.0` | 不应被运行污染 |
| Execution base | 节点本次执行前冻结的 base，等于自己的 design base 加连线上游 patch | 应反映当前数据流 |

也就是说，每个 Virtual Machining 节点可以都配置为 `radial_depth = 1.0`，但运行后其执行参数可能不同，例如 `0.9177`、`0.9223`、`0.9089`。这是正确行为。

## 页面与 Console 检查方法

运行 demo 后，在浏览器 DevTools Console 查看：

```js
window.workflowRuntimeState.virtual_node_runtime_parameters
```

每个虚拟加工节点会有：

```js
{
  design_parameters: { radial_depth: "1.0", ... },
  execution_parameters: { radial_depth: 0.9223366095915819, ... },
  display_parameters: { radial_depth: 0.9223366095915819, ... },
  base_version_id: "...",
  source_patch_ids: ["..."]
}
```

重点看：

- `design_parameters.radial_depth`：设计 base，应保持节点原始配置；
- `execution_parameters.radial_depth`：真实执行 base，应随上游补偿变化；
- `display_parameters.radial_depth`：Inspector 和节点卡片显示用参数；
- `source_patch_ids`：说明这个 VM 本次执行应用了哪些参数 patch。

页面节点卡片也会显示：

```text
base ae 1.0000 mm
```

或运行后显示：

```text
run ae 0.9223 mm
```

Inspector 中 Virtual Machining 节点显示：

- `Design radial depth`
- `Execution radial depth`
- `Runtime base`
- `Source patches`

## 测试工作流结构

自动化测试使用一个复杂闭环 demo 图：

```text
VM baseline
-> condition A
-> WTC A
-> parameter-update A
-> VM pass 1
-> condition B
-> WTC B
   -> parameter-update B main
      -> VM pass 2 main
      -> stop
   -> parameter-update B branch
      -> VM pass 2 branch
```

流程层面修改测试会在上述 demo 上追加实验支线：

```text
condition B
-> condition experimental
-> WTC experimental
-> parameter-update experimental
-> VM experimental
```

虚拟加工节点的刚度默认值按六点结构刚度基线验证，对应文件：

```text
D:\PhD\ARPPL_code\process_apps\thinwall-dt\frontend\public\stiffness.txt
```

## 参数期望

测试中所有 Virtual Machining 节点的设计 base 均为：

```text
radial_depth = 1.0
```

不同补偿方法产生确定性 delta：

| 补偿来源 | delta | 期望下游 VM execution radial_depth |
| --- | ---: | ---: |
| baseline VM | 0 | 1.0 |
| WTC A / stiffness_based | -0.0822910009537557 | 0.9177089990462443 |
| WTC B / first_order | -0.07766339040841813 | 0.9223366095915819 |
| WTC B / mirror | -0.09110084238181718 | 0.9088991576181828 |

关键失败形态：

```text
0.8107mm
```

这类结果通常说明第二个 VM 没有从自己的 `1.0` base 出发，而是错误地在上一个 VM 的补偿后值上继续叠加。

## 自动化测试覆盖

测试文件：

```text
workflow_platform/frontend/tests/workflowDataflowClosedLoopScenarios.test.mjs
```

覆盖场景：

1. `run all`：验证 baseline、pass 1、pass 2 main、pass 2 branch 各自冻结正确 execution base。
2. 修改 WTC B 的 `compensation method` 后执行 `run all`：验证主线和支线 VM 都按新方法重新计算。
3. 修改 WTC B 后，对主线最后一个 VM 执行 `run from selected`：验证运行会追溯并重跑所需上游，主线更新，未选支线保持原结果。
4. 修改 WTC B 后，对支线最后一个 VM 执行 `run from selected`：验证支线更新，主线保持原结果。
5. 在 demo 上新增实验支线后，对实验 VM 执行 `run from selected`：验证新支线能追溯上游并得到独立 execution base。
6. 在 demo 上新增实验支线后执行 `run all`：验证主线、原支线、实验支线互不污染。

每个场景同时检查：

- `WorkflowState.parameter_base_versions` 中的 VM execution base；
- `virtualNodeRuntimeParameterView()` 暴露给 Inspector / Console 的 `display_parameters.radial_depth`；
- 节点设计 base `node.params.process.radial_depth` 和 `node.processParameterBase.radial_depth` 仍保持 `1.0`。

## 执行结果

单独闭环场景测试：

```powershell
node --test workflow_platform/frontend/tests/workflowDataflowClosedLoopScenarios.test.mjs
```

结果：

```text
6 tests, 6 pass, 0 fail
```

运行参数视图测试：

```powershell
node --test workflow_platform/frontend/tests/workflowParameterBase.test.mjs
```

结果：

```text
6 tests, 6 pass, 0 fail
```

完整前端测试：

```powershell
node --test workflow_platform/frontend/tests/*.mjs
```

结果：

```text
77 tests, 77 pass, 0 fail
```

语法检查：

```powershell
node --check workflow_platform/frontend/app.js
node --check workflow_platform/frontend/runtime/workflowExecutionCore.js
node --check workflow_platform/frontend/runtime/workflowLogicNodes.js
node --check workflow_platform/frontend/runtime/workflowParameterBase.js
```

结果：全部通过。

禁止目录检查：

```powershell
git status --short -- virtual_machining_platform process_apps workflow_platform/docker contracts UnityBuild
```

结果：无输出，未修改禁止目录。

## 当前结论

本轮修复后，自动化测试覆盖了用户反馈的关键失败形态：

- `run all` 不会把前一个 VM 的补偿后参数作为下一个 VM 的 base；
- 主线和支线 VM 不会互相继承对方 patch；
- 修改 WTC 配置后，`run all` 与 `run from selected` 都会按当前连线重新计算；
- 新增支线后，参数更新只沿当前支线流动；
- 页面 Inspector / 节点卡片 / Console 现在显示 execution base，而不是只显示节点设计 base。

## 手动复测注意事项

为了避免历史缓存干扰，建议：

1. 重新 build workflow 前端容器；
2. 浏览器 `Ctrl + F5` 强制刷新；
3. 重新点击 `Load Closed-loop Demo`，不要导入早期污染过的旧 snapshot；
4. 运行 `Run Workflow`；
5. 在 Console 中检查：

```js
window.workflowRuntimeState.virtual_node_runtime_parameters
```

6. 选择每个 Virtual Machining 节点，在 Inspector 中看 `Execution radial depth`。
