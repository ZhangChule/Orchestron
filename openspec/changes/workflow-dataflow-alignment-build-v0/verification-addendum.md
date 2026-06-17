# 追加审查记录：多阶段参数与事件日志问题

## 观察结论

在 `run-1781603993774-lczr74-snapshot.json` 中可以看到：

- `virtual-machining-1` 冻结的 base 中 `radial_depth = 1.0`；
- `parameter-update-4` 和 `parameter-update-7` 均创建了 `ParameterPatch`；
- `virtual-machining-5` 冻结的 base 应用了两个 patch，`radial_depth = 0.8206599237028753`；
- `virtual-machining-8` 第一次执行继承了更新后的参数；
- 后续一次 `run_from_selected` 重新运行 `virtual-machining-8` 时，base 又回到 `radial_depth = 1.0`。

这说明当前问题不是 `parameter-update` 完全没有生成 patch，而是：

- 检查器主要展示节点设计参数或 base 参数，不直观展示本次 VM 实际请求参数；
- patch 当前按全局 pending list 应用，缺少严格的下游作用域；
- `run_from_selected` 和上游流程修改之间缺少 run lineage 边界，容易把“继续调试”和“重新开始一次实验”混在一个平铺事件日志里；
- 多分支 WTC / parameter-update 目前可能读取最新结果，而不是严格读取连线指定的上游结果。

## 新的验收方向

当前 change 继续补充两个验收目标：

1. 多阶段参数链路应可解释：VM base、ParameterPatch、下游 VM 实际请求参数之间必须能在 runtime state / snapshot / event log 中对应起来。
2. 事件日志不应只有无限增量平铺：`run_all` 或上游参数/流程变化后的重新运行应成为新的 active run，旧 run 折叠进入 run history；下游继续调试才保留增量关系。

## 复杂测试 demo 目标

后续测试 demo 应覆盖：

```text
VM-A baseline
  -> Condition-A
  -> WTC-A
  -> ParameterUpdate-A
  -> VM-B compensated-pass-1
  -> Condition-B
  -> WTC-B
  -> ParameterUpdate-B
  -> VM-C compensated-pass-2
  -> Stop

VM-A
  -> WTC-ALT
  -> ParameterUpdate-ALT
  -> VM-D alternative-parameters
```

所有 VM 可复用刚度文件：

```text
D:\PhD\ARPPL_code\process_apps\thinwall-dt\frontend\public\stiffness.txt
```

本轮实现只做最小可测修正，不修改 `/prediction/wall-error`、Unity Build、WTC/ARPPL 后端、contracts 或 docker。
