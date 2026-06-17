# 任务清单

## 范围约束

- 当前阶段：`/comet-open`，只整理 OpenSpec change 文档。
- 当前允许修改：`openspec/changes` 下的 change 文档。
- 当前不允许修改：任何业务代码、前端运行逻辑、后端算法、Docker、Unity Build、contracts。
- 当前运行行为：必须保持不变。

## Open 阶段任务

- [x] T0. 清理旧 OpenSpec change 文档。
  - 目的：删除之前未能稳定发挥 Comet 作用、且可能造成语义混乱的旧 change 内容。
  - 影响目录：`openspec/changes`。
  - 代码修改：否。

- [x] T1. 重写 `workflow-and-dataflow-alignment-v0/proposal.md`。
  - 目的：用中文说明为什么当前要先对齐工作流执行和数据流更新。
  - 影响目录：`openspec/changes/workflow-and-dataflow-alignment-v0`。
  - 代码修改：否。

- [x] T2. 重写 `workflow-and-dataflow-alignment-v0/design.md`。
  - 目的：定义虚拟加工节点作为工艺参数 base version 边界的设计语义。
  - 影响目录：`openspec/changes/workflow-and-dataflow-alignment-v0`。
  - 代码修改：否。

- [x] T3. 重写 `workflow-and-dataflow-alignment-v0/tasks.md`。
  - 目的：把后续工作拆成先设计、再实现的可控任务，不直接进入 build。
  - 影响目录：`openspec/changes/workflow-and-dataflow-alignment-v0`。
  - 代码修改：否。

## 后续设计任务

- [ ] D1. 梳理当前实现与本设计之间的差距。
  - 输出：当前 runtime 与目标语义的差距清单。
  - 代码修改：否。

- [ ] D2. 明确定义 `ProcessParameterBaseVersion`。
  - 输出：字段、生命周期、与虚拟加工节点的绑定规则。
  - 代码修改：否。

- [ ] D3. 明确定义 `ParameterPatch`。
  - 输出：patch 身份、目标 base、来源结果、幂等应用规则。
  - 代码修改：否。

- [ ] D4. 明确定义 `NodeResultVersion` 与 `input_fingerprint`。
  - 输出：节点结果版本、输入摘要、stale 判定规则。
  - 代码修改：否。

- [ ] D5. 明确定义运行模式。
  - 输出：`run all`、`run from selected`、`rerun stale only`、`resume from snapshot` 的行为表。
  - 代码修改：否。

- [ ] D6. 明确 event log 与 snapshot 的可读性要求。
  - 输出：事件摘要规则、参数变更 diff、结果版本引用、快照恢复语义。
  - 代码修改：否。

## 后续实现候选，不在本阶段执行

- [ ] I1. 在 `WorkflowState` 中加入参数 base version 与 patch 列表。
- [ ] I2. 让 `parameter-update` 生成幂等 patch，而不是直接重复叠加参数。
- [ ] I3. 为节点结果加入 `node_run_id`、`execution_index`、`input_fingerprint`。
- [ ] I4. 加入 stale 标记和最小失效传播。
- [ ] I5. 加入最小 run mode 选择。
- [ ] I6. 改进 event log / snapshot 的可读视图。

以上实现候选必须等待用户明确要求进入 build 后再执行。
