// 存放全局类型定义，如接口、枚举、数据结构等，要和后端接口字段对齐
// #region Process enums
export type CuttingMode = "" | "up_milling" | "down_milling";
export type CompensationMethod = "" | "mirror" | "first_order" | "stiffness_based";
export type FeedbackSeverity = "error" | "info" | "success" | "warning";
// #endregion

// #region Form state
export type WorkpieceForm = {
  length: string;
  height: string;
  thickness: string;
  baseWidth: string;
  baseHeight: string;
};

export type NumericDimensions = {
  length: number;
  height: number;
  thickness: number;
  baseWidth: number;
  baseHeight: number;
  wallHeight: number;
};

export type ToolParams = {
  toolType: string;
  diameter: string;
  teeth: string;
  helixAngle: string;
  immersionAngle: string;
  cutterLength: string;
  overallLength: string;
};

export type ProcessParams = {
  spindleSpeed: string;
  feedRate: string;
  axialDepth: string;
  radialDepth: string;
  cuttingMode: CuttingMode;
};

export type KeyPoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  stiffness: number;
  error?: number;
  matrixIndex?: number;
  rowIndex?: number;
  colIndex?: number;
};

export type Feedback = {
  severity: FeedbackSeverity;
  message: string;
};

export type PredictionResponse = {
  points: Array<KeyPoint & { error: number }>;
  summary: {
    point_count: number;
    min_error: number;
    max_error: number;
    average_error: number;
  };
  message: string;
};

export type CompensationSuggestionResponse = {
  method: CompensationMethod;
  suggestion_value: number;
  average_error: number;
  point_count: number;
  message: string;
};

export type MaterialForm = {
  name: string;
  elasticModulus: string;
  poissonRatio: string;
  density: string;
};
// #endregion

// #region Navigation and layout state
export type SelectedNodeId =
  | "workpiece.geometry"
  | "workpiece.material"
  | "workpiece.probes"
  | "tool.geometry"
  | "process.roughing.first_cut"
  | "prediction.v1"
  | "compensation.strategy"
  | "compensation.result";

export type NavNode = {
  id: string;
  label: string;
  children?: NavNode[];
};

export type RightTab = "properties" | "tasks";
export type FloatingPosition = { x: number; y: number };
// #endregion

// #region Workflow and API payloads
export type DemoStep =
  | "PARAM_INPUT"
  | "SCENE_READY"
  | "STIFFNESS_INPUT"
  | "WALL_ERROR_PREDICTION"
  | "MATERIAL_REMOVAL_PREVIEW"
  | "COMPENSATION_DONE"
  | "RESET";

export type UnityCommandType = "LOAD_WORKPIECE_AND_TOOL" | "START_MATERIAL_REMOVAL_PREVIEW" | "RESET_TO_INITIAL_SCENE";

export type UnityCommand = {
  id: number;
  type: UnityCommandType;
  payload?: unknown;
};

export type MaterialOption = MaterialForm & {
  id: string;
  label: string;
};

export type ToolOption = {
  id: string;
  label: string;
  imageUrl: string;
};

export type KeyPointSummary = {
  pointCount: number;
  errorCount: number;
  minError: number | null;
  maxError: number | null;
  averageError: number | null;
  maxAbsError: number;
};
// #endregion
