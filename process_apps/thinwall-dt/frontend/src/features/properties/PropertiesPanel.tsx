import type { ChangeEvent } from "react";
import { useMemo } from "react";

import { Alert, Box, Button, MenuItem, Stack } from "@mui/material";

import { BORDER, MATERIAL_LIBRARY, SURFACE, TOOL_LIBRARY } from "../../app/constants";
import type { CompensationMethod, CuttingMode } from "../../app/types";
import { DataRow } from "../../components/ui/DataRow";
import { ErrorCurveChart } from "../../components/ui/ErrorCurveChart";
import { Icon } from "../../components/ui/Icon";
import { InlineSelect } from "../../components/ui/InlineSelect";
import { NumberField } from "../../components/ui/NumberField";
import { WorkpieceGeometryPreview } from "../preview/WorkpieceGeometryPreview";
import { useMachiningStore } from "../../store/machiningStore";
import { formatNumber } from "../../utils/number";
import { getKeyPointSummary, parseDimensions } from "../../utils/workpiece";

import iconCommandArrow from "../../assets/siemens/element-command-arrow.svg";
import iconUpload from "../../assets/siemens/element-upload.svg";

export function PropertiesPanel() {
  // #region Store bindings
  const selectedNodeId = useMachiningStore((state) => state.selectedNodeId);
  const workpiece = useMachiningStore((state) => state.workpiece);
  const material = useMachiningStore((state) => state.material);
  const toolParams = useMachiningStore((state) => state.toolParams);
  const processParams = useMachiningStore((state) => state.processParams);
  const method = useMachiningStore((state) => state.method);
  const suggestion = useMachiningStore((state) => state.suggestion);
  const keyPoints = useMachiningStore((state) => state.keyPoints);
  const stiffnessFile = useMachiningStore((state) => state.stiffnessFile);
  const compensating = useMachiningStore((state) => state.compensating);
  const activeStep = useMachiningStore((state) => state.activeStep);
  const updateWorkpieceField = useMachiningStore((state) => state.updateWorkpieceField);
  const selectMaterial = useMachiningStore((state) => state.selectMaterial);
  const updateToolField = useMachiningStore((state) => state.updateToolField);
  const selectTool = useMachiningStore((state) => state.selectTool);
  const updateProcessField = useMachiningStore((state) => state.updateProcessField);
  const updateCuttingMode = useMachiningStore((state) => state.updateCuttingMode);
  const importStiffnessFile = useMachiningStore((state) => state.importStiffnessFile);
  const setMethod = useMachiningStore((state) => state.setMethod);
  const runErrorPrediction = useMachiningStore((state) => state.runErrorPrediction);
  const runMaterialRemovalPreview = useMachiningStore((state) => state.runMaterialRemovalPreview);
  const runCompensationPlan = useMachiningStore((state) => state.runCompensationPlan);
  // #endregion

  // #region Derived display state
  const { dimensions, issues } = useMemo(() => parseDimensions(workpiece), [workpiece]);
  const pointSummary = useMemo(() => getKeyPointSummary(keyPoints), [keyPoints]);
  const selectedTool = TOOL_LIBRARY.find((tool) => tool.id === toolParams.toolType);
  const hasStartedGeometryInput = Object.values(workpiece).some(Boolean);
  const sceneReady =
    activeStep === "SCENE_READY" ||
    activeStep === "STIFFNESS_INPUT" ||
    activeStep === "WALL_ERROR_PREDICTION" ||
    activeStep === "MATERIAL_REMOVAL_PREVIEW" ||
    activeStep === "COMPENSATION_DONE";
  const wallErrorReady = keyPoints.some((point) => Number.isFinite(point.error));
  // #endregion

  async function handleStiffnessFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    await importStiffnessFile(file);
  }

  // #region Property pages
  // selectedNodeId 来自左侧导航；每个分支就是右侧属性页的一屏。
  if (selectedNodeId === "workpiece.geometry") {
    return (
      <Stack spacing={1}>
        <WorkpieceGeometryPreview dimensions={dimensions} />
        <NumberField label="工件长度 L" value={workpiece.length} onChange={(value) => updateWorkpieceField("length", value)} />
        <NumberField label="工件总高 H1" value={workpiece.height} onChange={(value) => updateWorkpieceField("height", value)} />
        <NumberField label="工件壁厚 t" value={workpiece.thickness} onChange={(value) => updateWorkpieceField("thickness", value)} />
        <NumberField label="底座宽 W" value={workpiece.baseWidth} onChange={(value) => updateWorkpieceField("baseWidth", value)} />
        <NumberField label="底座高 H2" value={workpiece.baseHeight} onChange={(value) => updateWorkpieceField("baseHeight", value)} />
        {hasStartedGeometryInput && issues.length > 0 && <Alert severity="warning">{issues[0]}</Alert>}
      </Stack>
    );
  }

  if (selectedNodeId === "workpiece.material") {
    return (
      <Stack spacing={1}>
        <InlineSelect label="材料牌号" value={material.name} onChange={selectMaterial}>
          <MenuItem value="">未选择</MenuItem>
          {MATERIAL_LIBRARY.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.label}
            </MenuItem>
          ))}
        </InlineSelect>
        <DataRow label="弹性模量 E" value={material.elasticModulus ? `${material.elasticModulus} GPa` : "—"} />
        <DataRow label="泊松比 ν" value={material.poissonRatio || "—"} />
        <DataRow label="密度 ρ" value={material.density ? `${material.density} g/cm³` : "—"} />
      </Stack>
    );
  }

  if (selectedNodeId === "workpiece.probes") {
    return (
      <Stack spacing={1.1}>
        <Button component="label" variant="outlined" startIcon={<Icon src={iconUpload} />}>
          导入刚度测点数据
          <input hidden type="file" accept=".csv,.txt" onChange={handleStiffnessFileChange} />
        </Button>
        <DataRow label="当前文件" value={stiffnessFile ? stiffnessFile.name : "未导入"} tone={keyPoints.length > 0 ? "primary" : "default"} />
        <DataRow label="刚度测点数" value={`${pointSummary.pointCount} 点`} />
      </Stack>
    );
  }

  if (selectedNodeId === "tool.geometry") {
    return (
      <Stack spacing={1}>
        <InlineSelect label="刀具类型" value={toolParams.toolType} onChange={selectTool}>
          <MenuItem value="">未选择</MenuItem>
          {TOOL_LIBRARY.map((tool) => (
            <MenuItem key={tool.id} value={tool.id}>
              {tool.label}
            </MenuItem>
          ))}
        </InlineSelect>
        {selectedTool ? (
          <Box
            component="img"
            src={selectedTool.imageUrl}
            alt={selectedTool.label}
            sx={{
              width: "100%",
              aspectRatio: "21 / 9",
              objectFit: "contain",
              border: `1px solid ${BORDER}`,
              borderRadius: 1,
              backgroundColor: SURFACE,
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              aspectRatio: "16 / 9",
              display: "grid",
              placeItems: "center",
              color: "text.secondary",
              fontSize: 12.5,
              border: `1px solid ${BORDER}`,
              borderRadius: 1,
              backgroundColor: SURFACE,
            }}
          >
            请选择刀具类型
          </Box>
        )}
        <NumberField label="刀具直径 D (mm)" value={toolParams.diameter} onChange={(value) => updateToolField("diameter", value)} />
        <NumberField label="齿数 Z" value={toolParams.teeth} onChange={(value) => updateToolField("teeth", value)} />
        <NumberField label="螺旋角 β (°)" value={toolParams.helixAngle} onChange={(value) => updateToolField("helixAngle", value)} />
        <DataRow label="轴向浸入角 κ（°）" value={toolParams.immersionAngle ? `${toolParams.immersionAngle} deg` : "—"} />
        <NumberField label="刀刃长度 L1 (mm)" value={toolParams.cutterLength} onChange={(value) => updateToolField("cutterLength", value)} />
        <NumberField label="刀具总长 L2 (mm)" value={toolParams.overallLength} onChange={(value) => updateToolField("overallLength", value)} />
      </Stack>
    );
  }

  if (selectedNodeId === "process.roughing.first_cut") {
    return (
      <Stack spacing={1}>
        <NumberField label="主轴转速 n (r/min)" value={processParams.spindleSpeed} onChange={(value) => updateProcessField("spindleSpeed", value)} />
        <NumberField label="进给速度 F (mm/min)" value={processParams.feedRate} onChange={(value) => updateProcessField("feedRate", value)} />
        <NumberField label="轴向切深 ap (mm)" value={processParams.axialDepth} onChange={(value) => updateProcessField("axialDepth", value)} />
        <NumberField label="径向切深 ae (mm)" value={processParams.radialDepth} onChange={(value) => updateProcessField("radialDepth", value)} />
        <InlineSelect label="铣削方式" value={processParams.cuttingMode} onChange={(value) => updateCuttingMode(value as CuttingMode)}>
          <MenuItem value="">未选择</MenuItem>
          <MenuItem value="up_milling">逆铣</MenuItem>
          <MenuItem value="down_milling">顺铣</MenuItem>
        </InlineSelect>
      </Stack>
    );
  }

  if (selectedNodeId === "prediction.v1") {
    return (
      <Stack spacing={1}>
        <DataRow label="场景状态" value={sceneReady ? "已生成" : "未生成"} tone={sceneReady ? "primary" : "default"} />
        <Button
          variant="contained"
          onClick={() => void (wallErrorReady ? runMaterialRemovalPreview() : runErrorPrediction())}
          disabled={!sceneReady || !keyPoints.length}
          startIcon={<Icon src={iconCommandArrow} />}
        >
          {!keyPoints.length ? "请先导入刚度矩阵" : !wallErrorReady ? "预测壁厚误差" : activeStep === "MATERIAL_REMOVAL_PREVIEW" ? "重新执行预览" : "开始切削过程预览"}
        </Button>
        <DataRow label="刚度矩阵" value={stiffnessFile ? stiffnessFile.name : "未导入"} tone={keyPoints.length > 0 ? "primary" : "default"} />
        <DataRow label="壁厚误差" value="Unity 实时可视化" />
        <ErrorCurveChart points={keyPoints} averageError={pointSummary.averageError} />
        <DataRow label="平均壁厚偏差" value={pointSummary.averageError == null ? "—" : `${formatNumber(pointSummary.averageError, 5)} mm`} />
      </Stack>
    );
  }

  if (selectedNodeId === "compensation.strategy") {
    return (
      <Stack spacing={1}>
        <InlineSelect label="壁厚补偿方式" value={method} onChange={(value) => setMethod(value as CompensationMethod)}>
          <MenuItem value="">未选择</MenuItem>
          <MenuItem value="mirror">镜像补偿</MenuItem>
          <MenuItem value="first_order">线性补偿</MenuItem>
          <MenuItem value="stiffness_based">刚度修正补偿</MenuItem>
        </InlineSelect>
        <DataRow label="修正参数" value="下道径向切深 ae" />
        <DataRow label="补偿依据" value="预测壁厚偏差 δt" />
        <Button variant="contained" onClick={() => void runCompensationPlan()} disabled={compensating || !pointSummary.errorCount} startIcon={<Icon src={iconCommandArrow} />}>
          {compensating ? "计算中..." : "计算下道径向切深补偿量"}
        </Button>
      </Stack>
    );
  }

  // #endregion

  // compensation.result 使用最后这个默认分支，避免再包一层重复条件。
  return (
    <Stack spacing={1}>
      <ErrorCurveChart points={keyPoints} averageError={pointSummary.averageError} compensationValue={suggestion?.suggestion_value ?? null} />
      <DataRow label="壁厚补偿方式" value={method === "stiffness_based" ? "刚度修正补偿" : method === "first_order" ? "线性补偿" : method === "mirror" ? "镜像补偿" : "—"} />
      <DataRow label="下道 ae 修正" value={suggestion ? `${formatNumber(suggestion.suggestion_value, 5)} mm` : "—"} tone="primary" />
      <DataRow label="平均 δt" value={suggestion ? `${formatNumber(suggestion.average_error, 5)} mm` : "—"} />
    </Stack>
  );
}
