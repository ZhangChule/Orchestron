import { useRef, type ChangeEvent } from "react";

import { Box, Button, Stack, Typography } from "@mui/material";

import { BORDER, PRIMARY, SURFACE, TEXT, TEXT_SECONDARY } from "../../app/constants";
import type { DemoStep, MaterialForm, ProcessParams, ToolParams } from "../../app/types";
import { DataRow } from "../../components/ui/DataRow";
import { useMachiningStore } from "../../store/machiningStore";
import { formatNumber, parsePositiveNumber } from "../../utils/number";
import { getKeyPointSummary, parseDimensions } from "../../utils/workpiece";

// #region Task step presentation
const STEP_LABELS: Record<DemoStep, string> = {
  PARAM_INPUT: "输入加工参数",
  SCENE_READY: "加载加工场景",
  STIFFNESS_INPUT: "导入刚度数据",
  WALL_ERROR_PREDICTION: "预测壁厚误差",
  MATERIAL_REMOVAL_PREVIEW: "预览切削过程",
  COMPENSATION_DONE: "生成补偿建议",
  RESET: "已重置",
};

const STEP_ORDER: DemoStep[] = ["PARAM_INPUT", "SCENE_READY", "STIFFNESS_INPUT", "WALL_ERROR_PREDICTION", "MATERIAL_REMOVAL_PREVIEW", "COMPENSATION_DONE"];
const DONE_COLOR = "#1d7f5f";
const WAITING_COLOR = "#9aa8b5";
// #endregion

// #region Readiness helpers
function isToolReady(tool: ToolParams) {
  const diameter = parsePositiveNumber(tool.diameter);
  const teeth = parsePositiveNumber(tool.teeth);
  const helixAngle = tool.helixAngle.trim() ? Number(tool.helixAngle) : Number.NaN;
  const immersionAngle = tool.immersionAngle.trim() ? Number(tool.immersionAngle) : Number.NaN;
  const cutterLength = parsePositiveNumber(tool.cutterLength);
  const overallLength = parsePositiveNumber(tool.overallLength);
  return Boolean(tool.toolType && diameter && teeth && Number.isInteger(teeth) && Number.isFinite(helixAngle) && Number.isFinite(immersionAngle) && cutterLength && overallLength);
}

function isProcessReady(process: ProcessParams) {
  return Boolean(
    parsePositiveNumber(process.spindleSpeed) &&
      parsePositiveNumber(process.feedRate) &&
      parsePositiveNumber(process.axialDepth) &&
      parsePositiveNumber(process.radialDepth) &&
      process.cuttingMode,
  );
}

function isMaterialReady(material: MaterialForm) {
  return Boolean(material.name && material.elasticModulus && material.poissonRatio && material.density);
}

function getPrimaryButtonLabel(step: DemoStep, hasStiffness: boolean, hasWallError: boolean) {
  if (step === "PARAM_INPUT" || step === "RESET") return "加载场景";
  if (step === "SCENE_READY" || step === "STIFFNESS_INPUT") return hasStiffness ? "预测壁厚误差" : "上传刚度矩阵";
  if (step === "WALL_ERROR_PREDICTION") return hasWallError ? "开始切削过程预览" : "重新预测壁厚误差";
  if (step === "MATERIAL_REMOVAL_PREVIEW") return "生成补偿方案";
  return "重新调整参数";
}
// #endregion

export function TasksPanel() {
  // #region Store bindings
  const stiffnessFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeStep = useMachiningStore((state) => state.activeStep);
  const workpiece = useMachiningStore((state) => state.workpiece);
  const material = useMachiningStore((state) => state.material);
  const toolParams = useMachiningStore((state) => state.toolParams);
  const processParams = useMachiningStore((state) => state.processParams);
  const method = useMachiningStore((state) => state.method);
  const keyPoints = useMachiningStore((state) => state.keyPoints);
  const stiffnessFile = useMachiningStore((state) => state.stiffnessFile);
  const suggestion = useMachiningStore((state) => state.suggestion);
  const predicting = useMachiningStore((state) => state.predicting);
  const compensating = useMachiningStore((state) => state.compensating);
  const materialRemovalPreviewCompleted = useMachiningStore((state) => state.materialRemovalPreviewCompleted);
  const runPrimaryAction = useMachiningStore((state) => state.runPrimaryAction);
  const importStiffnessFile = useMachiningStore((state) => state.importStiffnessFile);
  const resetParameters = useMachiningStore((state) => state.resetParameters);
  const loadCase = useMachiningStore((state) => state.loadCase);
  const pointSummary = getKeyPointSummary(keyPoints);
  const busy = predicting || compensating;
  // #endregion

  // #region Derived workflow state
  const paramsReady =
    Boolean(parseDimensions(workpiece).dimensions) &&
    isMaterialReady(material) &&
    isToolReady(toolParams) &&
    isProcessReady(processParams);
  const sceneReady =
    activeStep === "SCENE_READY" ||
    activeStep === "STIFFNESS_INPUT" ||
    activeStep === "WALL_ERROR_PREDICTION" ||
    activeStep === "MATERIAL_REMOVAL_PREVIEW" ||
    activeStep === "COMPENSATION_DONE";
  const wallErrorReady = keyPoints.some((point) => Number.isFinite(point.error));
  const materialRemovalReady = sceneReady && wallErrorReady;
  const materialRemovalStarted = activeStep === "MATERIAL_REMOVAL_PREVIEW" || activeStep === "COMPENSATION_DONE";
  const compensationReady = materialRemovalPreviewCompleted && Boolean(method) && pointSummary.errorCount > 0;
  const compensationDone = activeStep === "COMPENSATION_DONE" && Boolean(suggestion);
  const primaryActionReady =
    !busy &&
    (activeStep === "PARAM_INPUT" || activeStep === "RESET"
      ? paramsReady
      : activeStep === "SCENE_READY" || activeStep === "STIFFNESS_INPUT" || activeStep === "WALL_ERROR_PREDICTION" || activeStep === "MATERIAL_REMOVAL_PREVIEW"
        ? activeStep === "MATERIAL_REMOVAL_PREVIEW"
          ? materialRemovalPreviewCompleted
          : true
        : true);

  const stepVisuals: Record<DemoStep, "done" | "active" | "waiting"> = {
    PARAM_INPUT: paramsReady ? "done" : "active",
    SCENE_READY: sceneReady ? "done" : paramsReady ? "active" : "waiting",
    STIFFNESS_INPUT: keyPoints.length > 0 ? "done" : sceneReady ? "active" : "waiting",
    WALL_ERROR_PREDICTION: wallErrorReady ? "done" : predicting ? "active" : keyPoints.length > 0 ? "active" : "waiting",
    MATERIAL_REMOVAL_PREVIEW: materialRemovalPreviewCompleted ? "done" : materialRemovalStarted ? "active" : materialRemovalReady ? "active" : "waiting",
    COMPENSATION_DONE: compensationDone ? "done" : materialRemovalPreviewCompleted ? "active" : "waiting",
    RESET: "waiting",
  };

  const taskStatus = compensationDone
    ? "补偿方案完成"
    : materialRemovalStarted
      ? materialRemovalPreviewCompleted
        ? compensationReady
          ? "本次切削过程预览完成，待生成补偿方案"
          : !method
            ? "本次切削过程预览完成，待选择补偿方式"
            : "本次切削过程预览完成，待获取壁厚误差后补偿"
        : "切削过程预览进行中， 等待结束"
      : sceneReady
        ? wallErrorReady
          ? "壁厚误差已预测，待开始切削过程预览"
          : keyPoints.length > 0
            ? "刚度数据已导入，待预测壁厚误差"
          : "场景已加载，待导入刚度测点数据后开始切削过程预览"
        : paramsReady
          ? "已设置工件与切削参数，待加载加工场景"
          : activeStep === "RESET"
            ? "已重置，等待设置工件与切削参数"
            : "等待设置工件与切削参数";
  // #endregion

  // #region Event handlers
  async function handleStiffnessFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    await importStiffnessFile(file);
  }

  function handlePrimaryAction() {
    if ((activeStep === "SCENE_READY" || activeStep === "STIFFNESS_INPUT") && !keyPoints.length) {
      // 场景生成后，主按钮先复用隐藏 input 上传刚度文件；上传成功后再开始预览。
      stiffnessFileInputRef.current?.click();
      return;
    }
    void runPrimaryAction();
  }
  // #endregion

  return (
    <Stack spacing={1.35}>
      <input ref={stiffnessFileInputRef} hidden type="file" accept=".csv,.txt" onChange={(event) => void handleStiffnessFileChange(event)} />
      <Stack spacing={0.8}>
        {STEP_ORDER.map((step, index) => {
          const visual = stepVisuals[step];
          const done = visual === "done";
          const active = visual === "active";
          return (
            <Box
              key={step}
              sx={{
                p: 1,
                display: "grid",
                gridTemplateColumns: "26px minmax(0, 1fr)",
                alignItems: "center",
                gap: 1,
                width: "100%",
                borderRadius: 1,
                border: `1px solid ${active ? PRIMARY : done ? "rgba(29,127,95,0.42)" : BORDER}`,
                backgroundColor: active ? "rgba(0,107,143,0.06)" : done ? "rgba(29,127,95,0.055)" : SURFACE,
              }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 850,
                  backgroundColor: done ? DONE_COLOR : active ? PRIMARY : WAITING_COLOR,
                }}
              >
                {index + 1}
              </Box>
              <Typography sx={{ minWidth: 0, color: active || done ? TEXT : TEXT_SECONDARY, fontSize: 13, fontWeight: active || done ? 850 : 700 }}>
                {STEP_LABELS[step]}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      <Button variant="contained" disabled={!primaryActionReady} onClick={handlePrimaryAction}>
        {busy ? "处理中..." : getPrimaryButtonLabel(activeStep, keyPoints.length > 0, wallErrorReady)}
      </Button>
      <Button variant="text" onClick={resetParameters}>
        重置本次参数
      </Button>
      <Button variant="text" onClick={loadCase}>
        载入示例工艺
      </Button>

      <Stack spacing={0.45}>
        <DataRow label="刚度测点" value={stiffnessFile ? stiffnessFile.name : "未导入"} tone={keyPoints.length > 0 ? "primary" : "default"} />
        <DataRow label="刚度测点数" value={`${pointSummary.pointCount} 点`} />
        <DataRow label="平均壁厚偏差" value={pointSummary.averageError == null ? "—" : `${formatNumber(pointSummary.averageError, 5)} mm`} />
        <DataRow label="建议补偿量" value={suggestion ? `${formatNumber(suggestion.suggestion_value, 5)} mm` : "—"} tone="primary" />
        <DataRow label="当前工艺状态" value={taskStatus} />
      </Stack>
    </Stack>
  );
}
