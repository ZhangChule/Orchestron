import { create } from "zustand";

import {
  API_BASE_URL,
  CASE_MATERIAL,
  CASE_PROCESS,
  CASE_TOOL,
  CASE_WORKPIECE,
  DEFAULT_MATERIAL,
  DEFAULT_PROCESS,
  DEFAULT_TOOL,
  DEFAULT_WORKPIECE,
  MATERIAL_LIBRARY,
} from "../app/constants";
import type {
  CompensationMethod,
  CompensationSuggestionResponse,
  CuttingMode,
  DemoStep,
  Feedback,
  KeyPoint,
  MaterialForm,
  NumericDimensions,
  PredictionResponse,
  ProcessParams,
  RightTab,
  SelectedNodeId,
  ToolParams,
  UnityCommand,
  UnityCommandType,
  WorkpieceForm,
} from "../app/types";
import { calculateLocalSuggestion } from "../utils/compensation";
import { parsePositiveNumber } from "../utils/number";
import { parseStiffnessKeyPoints, readTextFile } from "../utils/stiffnessParser";
import { getKeyPointSummary, parseDimensions } from "../utils/workpiece";

// 这是前端业务状态的唯一入口：表单值、任务流状态、Unity 命令和预测/补偿结果都从这里读写。
// #region Store contract
type MachiningStore = {
  workpiece: WorkpieceForm;
  material: MaterialForm;
  toolParams: ToolParams;
  processParams: ProcessParams;
  keyPoints: KeyPoint[];
  stiffnessFile: File | null;
  previewEnabled: boolean;
  feedback: Feedback | null;
  predicting: boolean;
  compensating: boolean;
  method: CompensationMethod;
  suggestion: CompensationSuggestionResponse | null;
  selectedNodeId: SelectedNodeId;
  rightTab: RightTab;
  showMachiningStatus: boolean;
  activeStep: DemoStep;
  selectedPredictionModel: string;
  unityCommand: UnityCommand | null;
  materialRemovalPreviewCompleted: boolean;
  updateWorkpieceField: (field: keyof WorkpieceForm, value: string) => void;
  updateMaterialField: (field: keyof MaterialForm, value: string) => void;
  selectMaterial: (materialId: string) => void;
  updateToolField: (field: keyof ToolParams, value: string) => void;
  selectTool: (toolId: string) => void;
  updateProcessField: (field: keyof ProcessParams, value: string) => void;
  updateCuttingMode: (value: CuttingMode) => void;
  setKeyPoints: (points: KeyPoint[]) => void;
  setStiffnessFile: (file: File | null) => void;
  importStiffnessFile: (file: File | null) => Promise<boolean>;
  clearStiffness: () => void;
  setFeedback: (feedback: Feedback | null) => void;
  setMethod: (method: CompensationMethod) => void;
  setSelectedNodeId: (id: SelectedNodeId) => void;
  setRightTab: (tab: RightTab) => void;
  setShowMachiningStatus: (show: boolean | ((previous: boolean) => boolean)) => void;
  setActiveStep: (step: DemoStep) => void;
  resetParameters: () => void;
  loadCase: () => void;
  sendUnityCommand: (type: UnityCommandType, payload?: unknown) => void;
  markMaterialRemovalPreviewCompleted: () => void;
  runPrimaryAction: () => Promise<void>;
  runGenerateScene: () => Promise<boolean>;
  runMaterialRemovalPreview: () => Promise<boolean>;
  runMachiningPreview: () => Promise<boolean>;
  runErrorPrediction: () => Promise<boolean>;
  runCompensationPlan: () => Promise<boolean>;
};
// #endregion

// #region Validation and payload shaping
function validateTool(tool: ToolParams) {
  const diameter = parsePositiveNumber(tool.diameter);
  const teeth = parsePositiveNumber(tool.teeth);
  const helixAngle = tool.helixAngle.trim() ? Number(tool.helixAngle) : Number.NaN;
  const immersionAngle = tool.immersionAngle.trim() ? Number(tool.immersionAngle) : Number.NaN;
  const cutterLength = parsePositiveNumber(tool.cutterLength);
  const overallLength = parsePositiveNumber(tool.overallLength);
  if (
    !tool.toolType ||
    diameter == null ||
    teeth == null ||
    !Number.isInteger(teeth) ||
    !Number.isFinite(helixAngle) ||
    !Number.isFinite(immersionAngle) ||
    cutterLength == null ||
    overallLength == null
  ) {
    throw new Error("请检查刀具直径、齿数、螺旋角、轴向浸入角、刀刃长度和刀具总长。");
  }
  return {
    type: tool.toolType,
    diameter,
    teeth,
    helix_angle: helixAngle,
    immersion_angle: immersionAngle,
    cutter_length: cutterLength,
    overall_length: overallLength,
  };
}

function validateProcess(process: ProcessParams) {
  const spindleSpeed = parsePositiveNumber(process.spindleSpeed);
  const feedRate = parsePositiveNumber(process.feedRate);
  const axialDepth = parsePositiveNumber(process.axialDepth);
  const radialDepth = parsePositiveNumber(process.radialDepth);
  if (spindleSpeed == null || feedRate == null || axialDepth == null || radialDepth == null || !process.cuttingMode) {
    throw new Error("请检查主轴转速、进给速度、轴向切深、径向切深和铣削方向。");
  }
  return {
    spindle_speed: spindleSpeed,
    feed_rate: feedRate,
    axial_depth: axialDepth,
    radial_depth: radialDepth,
    cutting_mode: process.cuttingMode,
  };
}

function validateMaterial(material: MaterialForm) {
  if (!material.name || !material.elasticModulus || !material.poissonRatio || !material.density) {
    throw new Error("请先选择材料牌号。");
  }
}

function validateSceneInputs(state: MachiningStore) {
  const { dimensions, issues } = parseDimensions(state.workpiece);
  if (!dimensions) {
    throw new Error(issues[0] ?? "请先输入有效工件尺寸。");
  }
  validateMaterial(state.material);
  validateTool(state.toolParams);
  validateProcess(state.processParams);
}
// #endregion

// #region Workflow helpers
function createUnityCommand(current: UnityCommand | null, type: UnityCommandType, payload?: unknown): UnityCommand {
  return { id: (current?.id ?? 0) + 1, type, payload };
}

function buildUnityPreviewPayload(points: KeyPoint[], dimensions: NumericDimensions, process: ReturnType<typeof validateProcess>) {
  return {
    workpiece: {
      length: dimensions.length,
      height: dimensions.height,
      thickness: dimensions.thickness,
      baseWidth: dimensions.baseWidth,
      baseHeight: dimensions.baseHeight,
    },
    process: {
      spindleSpeed: process.spindle_speed,
      feedRate: process.feed_rate,
      axialDepth: process.axial_depth,
      radialDepth: process.radial_depth,
      cuttingMode: process.cutting_mode,
    },
    points: points
      .filter((point) => Number.isFinite(point.error))
      .map((point) => ({
        id: point.id,
        x: point.y - process.radial_depth,
        y: point.z,
        z: point.x,
        stiffness: point.stiffness,
        error: point.error,
      })),
  };
}

function clearPointErrors(points: KeyPoint[]) {
  return points.map((point) => ({
    id: point.id,
    x: point.x,
    y: point.y,
    z: point.z,
    stiffness: point.stiffness,
    matrixIndex: point.matrixIndex,
    rowIndex: point.rowIndex,
    colIndex: point.colIndex,
  }));
}

function getStepAfterStiffnessChange(state: MachiningStore): DemoStep {
  if (
    state.previewEnabled &&
    (state.activeStep === "SCENE_READY" ||
      state.activeStep === "STIFFNESS_INPUT" ||
      state.activeStep === "WALL_ERROR_PREDICTION" ||
      state.activeStep === "MATERIAL_REMOVAL_PREVIEW" ||
      state.activeStep === "COMPENSATION_DONE")
  ) {
    return "STIFFNESS_INPUT";
  }
  return "PARAM_INPUT";
}
// #endregion

// #region Initial state
function getInitialState() {
  return {
    workpiece: DEFAULT_WORKPIECE,
    material: DEFAULT_MATERIAL,
    toolParams: DEFAULT_TOOL,
    processParams: DEFAULT_PROCESS,
    keyPoints: [] as KeyPoint[],
    stiffnessFile: null as File | null,
    previewEnabled: false,
    feedback: null as Feedback | null,
    predicting: false,
    compensating: false,
    method: "" as CompensationMethod,
    suggestion: null as CompensationSuggestionResponse | null,
    selectedNodeId: "workpiece.geometry" as SelectedNodeId,
    rightTab: "properties" as RightTab,
    showMachiningStatus: false,
    activeStep: "PARAM_INPUT" as DemoStep,
    selectedPredictionModel: "v1.0",
    unityCommand: null as UnityCommand | null,
    materialRemovalPreviewCompleted: false,
  };
}
// #endregion

export const useMachiningStore = create<MachiningStore>((set, get) => ({
  ...getInitialState(),

  // #region Parameter setters
  updateWorkpieceField: (field, value) =>
    set((state) => ({
      workpiece: { ...state.workpiece, [field]: value },
      keyPoints: clearPointErrors(state.keyPoints),
      suggestion: null,
      previewEnabled: false,
      activeStep: "PARAM_INPUT",
      materialRemovalPreviewCompleted: false,
    })),

  updateMaterialField: (field, value) =>
    set((state) => ({
      material: { ...state.material, [field]: value },
      keyPoints: clearPointErrors(state.keyPoints),
      suggestion: null,
      previewEnabled: false,
      activeStep: "PARAM_INPUT",
      materialRemovalPreviewCompleted: false,
    })),

  selectMaterial: (materialId) => {
    const material = MATERIAL_LIBRARY.find((item) => item.id === materialId);
    if (!material) {
      set((state) => ({
        material: DEFAULT_MATERIAL,
        keyPoints: clearPointErrors(state.keyPoints),
        suggestion: null,
        previewEnabled: false,
        activeStep: "PARAM_INPUT",
        materialRemovalPreviewCompleted: false,
      }));
      return;
    }
    set((state) => ({
      material: {
        name: material.name,
        elasticModulus: material.elasticModulus,
        poissonRatio: material.poissonRatio,
        density: material.density,
      },
      keyPoints: clearPointErrors(state.keyPoints),
      suggestion: null,
      previewEnabled: false,
      activeStep: "PARAM_INPUT",
      materialRemovalPreviewCompleted: false,
    }));
  },

  updateToolField: (field, value) =>
    set((state) => ({
      toolParams: { ...state.toolParams, [field]: value },
      keyPoints: clearPointErrors(state.keyPoints),
      suggestion: null,
      previewEnabled: false,
      activeStep: "PARAM_INPUT",
      materialRemovalPreviewCompleted: false,
    })),

  selectTool: (toolId) =>
    set((state) => ({
      toolParams: { ...state.toolParams, toolType: toolId, immersionAngle: toolId ? "90" : "" },
      keyPoints: clearPointErrors(state.keyPoints),
      suggestion: null,
      previewEnabled: false,
      activeStep: "PARAM_INPUT",
      materialRemovalPreviewCompleted: false,
    })),

  updateProcessField: (field, value) =>
    set((state) => ({
      processParams: { ...state.processParams, [field]: value },
      keyPoints: clearPointErrors(state.keyPoints),
      suggestion: null,
      previewEnabled: false,
      activeStep: "PARAM_INPUT",
      materialRemovalPreviewCompleted: false,
    })),

  updateCuttingMode: (value) =>
    set((state) => ({
      processParams: { ...state.processParams, cuttingMode: value },
      keyPoints: clearPointErrors(state.keyPoints),
      suggestion: null,
      previewEnabled: false,
      activeStep: "PARAM_INPUT",
      materialRemovalPreviewCompleted: false,
    })),
  // #endregion

  // #region Stiffness data
  setKeyPoints: (points) =>
    set((state) => ({
      keyPoints: points,
      suggestion: null,
      activeStep: getStepAfterStiffnessChange(state),
      materialRemovalPreviewCompleted: false,
    })),
  setStiffnessFile: (file) =>
    set((state) => ({
      stiffnessFile: file,
      suggestion: null,
      activeStep: getStepAfterStiffnessChange(state),
      materialRemovalPreviewCompleted: false,
    })),
  importStiffnessFile: async (file) => {
    // 属性面板和任务面板都走这个入口，保证文件名和解析后的 keyPoints 始终同步。
    if (!file) return false;

    try {
      const text = await readTextFile(file);
      const points = parseStiffnessKeyPoints(text);
      set((state) => ({
        stiffnessFile: file,
        keyPoints: points,
        suggestion: null,
        activeStep: getStepAfterStiffnessChange(state),
        materialRemovalPreviewCompleted: false,
        feedback: { severity: "success", message: `已解析 ${points.length} 个刚度测点。` },
      }));
      return true;
    } catch (error) {
      set((state) => ({
        stiffnessFile: null,
        keyPoints: [],
        suggestion: null,
        activeStep: getStepAfterStiffnessChange(state),
        materialRemovalPreviewCompleted: false,
        feedback: { severity: "error", message: error instanceof Error ? error.message : "刚度文件解析失败。" },
      }));
      return false;
    }
  },
  clearStiffness: () =>
    set((state) => ({
      stiffnessFile: null,
      keyPoints: [],
      suggestion: null,
      activeStep: getStepAfterStiffnessChange(state),
      materialRemovalPreviewCompleted: false,
    })),
  // #endregion

  // #region UI state and reset helpers
  setFeedback: (feedback) => set({ feedback }),
  setMethod: (method) => set({ method, suggestion: null }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setRightTab: (tab) => set({ rightTab: tab }),
  setShowMachiningStatus: (show) =>
    set((state) => ({
      showMachiningStatus: typeof show === "function" ? show(state.showMachiningStatus) : show,
    })),
  setActiveStep: (step) => set({ activeStep: step }),

  resetParameters: () =>
    set((state) => ({
      ...getInitialState(),
      activeStep: "RESET",
      unityCommand: createUnityCommand(state.unityCommand, "RESET_TO_INITIAL_SCENE"),
    })),

  loadCase: () =>
    set({
      workpiece: CASE_WORKPIECE,
      material: CASE_MATERIAL,
      toolParams: CASE_TOOL,
      processParams: CASE_PROCESS,
      keyPoints: [],
      stiffnessFile: null,
      previewEnabled: false,
      method: "stiffness_based",
      suggestion: null,
      predicting: false,
      compensating: false,
      activeStep: "PARAM_INPUT",
      materialRemovalPreviewCompleted: false,
      feedback: { severity: "success", message: "已加载示例工艺参数。" },
    }),
  // #endregion

  // #region Unity-driven workflow
  sendUnityCommand: (type, payload) =>
    set((state) => ({
      unityCommand: createUnityCommand(state.unityCommand, type, payload),
    })),

  markMaterialRemovalPreviewCompleted: () =>
    set((state) => ({
      materialRemovalPreviewCompleted: true,
      method: state.method || "stiffness_based",
      suggestion: null,
      activeStep: "MATERIAL_REMOVAL_PREVIEW",
      feedback: { severity: "success", message: "切削过程预览完成，可以生成补偿方案。" },
    })),

  runPrimaryAction: async () => {
    const step = get().activeStep;
    if (step === "PARAM_INPUT" || step === "RESET") {
      await get().runGenerateScene();
      return;
    }
    if (step === "SCENE_READY" || step === "STIFFNESS_INPUT") {
      await get().runErrorPrediction();
      return;
    }
    if (step === "WALL_ERROR_PREDICTION") {
      if (get().keyPoints.some((point) => Number.isFinite(point.error))) {
        await get().runMaterialRemovalPreview();
        return;
      }
      await get().runErrorPrediction();
      return;
    }
    if (step === "MATERIAL_REMOVAL_PREVIEW") {
      await get().runCompensationPlan();
      return;
    }
    set({ activeStep: "PARAM_INPUT", feedback: { severity: "info", message: "可以重新调整参数。" } });
  },

  runGenerateScene: async () => {
    try {
      validateSceneInputs(get());
      set((state) => ({
        previewEnabled: true,
        activeStep: "STIFFNESS_INPUT",
        unityCommand: createUnityCommand(state.unityCommand, "LOAD_WORKPIECE_AND_TOOL"),
        materialRemovalPreviewCompleted: false,
        feedback: { severity: "success", message: "成功加载工件和刀具模型。" },
      }));
      return true;
    } catch (error) {
      set({ feedback: { severity: "error", message: error instanceof Error ? error.message : "参数无效。" } });
      return false;
    }
  },

  runMaterialRemovalPreview: async () => {
    const state = get();
    if (
      !state.previewEnabled ||
      (state.activeStep !== "SCENE_READY" &&
        state.activeStep !== "STIFFNESS_INPUT" &&
        state.activeStep !== "WALL_ERROR_PREDICTION" &&
        state.activeStep !== "MATERIAL_REMOVAL_PREVIEW" &&
        state.activeStep !== "COMPENSATION_DONE")
    ) {
      set({ feedback: { severity: "error", message: "请先生成 Unity 场景。" } });
      return false;
    }
    if (!state.keyPoints.length) {
      set({ feedback: { severity: "error", message: "请先导入刚度点，再开始切削过程预览。" } });
      return false;
    }
    if (!state.keyPoints.some((point) => Number.isFinite(point.error))) {
      set({ feedback: { severity: "error", message: "请先完成壁厚误差预测，再开始切削过程预览。" } });
      return false;
    }
    const { dimensions, issues } = parseDimensions(state.workpiece);
    if (!dimensions) {
      set({ feedback: { severity: "error", message: issues[0] ?? "请先输入有效工件尺寸。" } });
      return false;
    }
    let process: ReturnType<typeof validateProcess>;
    try {
      process = validateProcess(state.processParams);
    } catch (error) {
      set({ feedback: { severity: "error", message: error instanceof Error ? error.message : "请检查加工参数。" } });
      return false;
    }

    set((current) => ({
      activeStep: "MATERIAL_REMOVAL_PREVIEW",
      unityCommand: createUnityCommand(current.unityCommand, "START_MATERIAL_REMOVAL_PREVIEW", buildUnityPreviewPayload(current.keyPoints, dimensions, process)),
      materialRemovalPreviewCompleted: false,
      feedback: { severity: "success", message: "已向 Unity 发送误差点，开始切削过程预览。" },
    }));
    return true;
  },

  runMachiningPreview: async () => {
    return get().runGenerateScene();
  },
  // #endregion

  // #region Backend API hooks with local fallback
  runErrorPrediction: async () => {
    const state = get();
    const { dimensions, issues } = parseDimensions(state.workpiece);
    if (!state.previewEnabled || (state.activeStep !== "SCENE_READY" && state.activeStep !== "STIFFNESS_INPUT" && state.activeStep !== "WALL_ERROR_PREDICTION")) {
      set({ feedback: { severity: "error", message: "请先生成 Unity 场景。" } });
      return false;
    }
    if (!dimensions) {
      set({ feedback: { severity: "error", message: issues[0] ?? "请先输入有效工件尺寸。" } });
      return false;
    }
    if (!state.keyPoints.length) {
      set({ feedback: { severity: "error", message: "请先导入刚度点。" } });
      return false;
    }

    try {
      validateMaterial(state.material);
      const tool = validateTool(state.toolParams);
      const process = validateProcess(state.processParams);
      set({ predicting: true, suggestion: null, activeStep: "WALL_ERROR_PREDICTION", materialRemovalPreviewCompleted: false });

      const payload = {
        workpiece: {
          length: dimensions.length,
          height: dimensions.height,
          thickness: dimensions.thickness,
          base_width: dimensions.baseWidth,
          base_height: dimensions.baseHeight,
        },
        material: state.material,
        tool,
        process,
        key_points: state.keyPoints.map(({ id, stiffness }) => ({ id, stiffness })),
        model_version: state.selectedPredictionModel,
      };
      const response = await fetch(`${API_BASE_URL}/prediction/wall-error`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "预测接口请求失败。");
      }

      const result = (await response.json()) as PredictionResponse;
      set({
        keyPoints: result.points,
        previewEnabled: true,
        activeStep: "WALL_ERROR_PREDICTION",
        materialRemovalPreviewCompleted: false,
        feedback: { severity: "success", message: `壁厚误差预测完成，${result.summary.point_count} 个关键点已写入误差。` },
      });
      return true;
    } catch (error) {
      set({
        feedback: {
          severity: "error",
          message: error instanceof Error ? `壁厚误差预测失败：${error.message}` : "壁厚误差预测失败。",
        },
      });
      return false;
    } finally {
      set({ predicting: false });
    }
  },

  runCompensationPlan: async () => {
    const state = get();
    if (!state.selectedPredictionModel) {
      set({ feedback: { severity: "error", message: "请先选择预测模型。" } });
      return false;
    }
    if (!state.method) {
      set({ feedback: { severity: "error", message: "请先选择补偿方式。" } });
      return false;
    }
    if (!state.keyPoints.some((point) => Number.isFinite(point.error))) {
      set({ feedback: { severity: "error", message: "请先完成壁厚误差预测。" } });
      return false;
    }

    const radialDepth = parsePositiveNumber(state.processParams.radialDepth);
    if (radialDepth == null) {
      set({ feedback: { severity: "error", message: "请先输入有效的径向切深。" } });
      return false;
    }

    set({ compensating: true });
    try {
      const response = await fetch(`${API_BASE_URL}/compensation/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: state.method,
          radial_depth: radialDepth,
          model_version: state.selectedPredictionModel,
          points: state.keyPoints
            .filter((point) => Number.isFinite(point.error))
            .map((point) => ({
              id: point.id,
              x: point.x,
              y: point.y,
              z: point.z,
              stiffness: point.stiffness,
              error: point.error,
            })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "补偿接口请求失败。");
      }

      const result = (await response.json()) as CompensationSuggestionResponse;
      set({
        suggestion: result,
        activeStep: "COMPENSATION_DONE",
        feedback: { severity: "success", message: "补偿方案已生成。" },
      });
      return true;
    } catch (error) {
      try {
        const summary = getKeyPointSummary(get().keyPoints);
        const local = calculateLocalSuggestion(get().method, radialDepth, get().keyPoints);
        set({
          suggestion: {
            method: get().method,
            suggestion_value: local.suggestion,
            average_error: local.averageError,
            point_count: summary.errorCount,
            message: "local fallback suggestion",
          },
          activeStep: "COMPENSATION_DONE",
          feedback: {
            severity: "warning",
            message: error instanceof Error ? `补偿接口未接通，已使用前端占位计算。${error.message}` : "补偿接口未接通，已使用前端占位计算。",
          },
        });
        return true;
      } catch (fallbackError) {
        set({ feedback: { severity: "error", message: fallbackError instanceof Error ? fallbackError.message : "补偿计算失败。" } });
        return false;
      }
    } finally {
      set({ compensating: false });
    }
  },
  // #endregion
}));
