// 存放全局常量，如API地址、默认参数、颜色主题等
import type { MaterialForm, MaterialOption, NavNode, ProcessParams, ToolOption, ToolParams, WorkpieceForm } from "./types";

// #region Runtime config
function normalizeApiBase(value: string) {
  return value.replace(/\/+$/, "");
}

function inferApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:8000";
  }
  return "/api/thinwall-dt";
}

export const API_BASE_URL = normalizeApiBase(import.meta.env.VITE_API_BASE_URL ?? inferApiBaseUrl());
// #endregion

// #region Design tokens
export const APP_FONT = '"Inter", "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif';

export const PAGE_BG = "#eef2f5";
export const SURFACE = "#ffffff";
export const SURFACE_ALT = "#f7f9fb";
export const BORDER = "#d7e0e7";
export const TEXT = "#102638";
export const TEXT_SECONDARY = "#607386";
export const PRIMARY = "#006b8f";
export const PRIMARY_HOVER = "#008094";
export const DANGER = "#b63737";
export const BLUE_NEGATIVE = "#1267c4";
export const RED_POSITIVE = "#c83e3e";
export const MODEL_NEUTRAL = "#8fa4b3";
// #endregion

// #region Empty/default form values
export const DEFAULT_WORKPIECE: WorkpieceForm = {
  length: "",
  height: "",
  thickness: "",
  baseWidth: "",
  baseHeight: "",
};

export const DEFAULT_TOOL: ToolParams = {
  toolType: "",
  diameter: "",
  teeth: "",
  helixAngle: "",
  immersionAngle: "",
  cutterLength: "",
  overallLength: "",
};

export const DEFAULT_PROCESS: ProcessParams = {
  spindleSpeed: "",
  feedRate: "",
  axialDepth: "",
  radialDepth: "",
  cuttingMode: "",
};

export const DEFAULT_MATERIAL: MaterialForm = {
  name: "",
  elasticModulus: "",
  poissonRatio: "",
  density: "",
};
// #endregion

// #region Demo case values
export const CASE_WORKPIECE: WorkpieceForm = {
  length: "120",
  height: "56",
  thickness: "3",
  baseWidth: "64",
  baseHeight: "16",
};

export const CASE_TOOL: ToolParams = {
  toolType: "flat_end_mill",
  diameter: "4.0",
  teeth: "2",
  helixAngle: "30",
  immersionAngle: "90",
  cutterLength: "10",
  overallLength: "32",
};

export const CASE_PROCESS: ProcessParams = {
  spindleSpeed: "7200",
  feedRate: "48",
  axialDepth: "10",
  radialDepth: "1.0",
  cuttingMode: "down_milling",
};

export const CASE_MATERIAL: MaterialForm = {
  name: "7075-T6",
  elasticModulus: "71.7",
  poissonRatio: "0.33",
  density: "2.81",
};
// #endregion

// #region Local option libraries
export const MATERIAL_LIBRARY: MaterialOption[] = [
  {
    id: "7075-T6",
    label: "7075-T6",
    name: "7075-T6",
    elasticModulus: "71.7",
    poissonRatio: "0.33",
    density: "2.81",
  },
];

export const TOOL_LIBRARY: ToolOption[] = [
  {
    id: "flat_end_mill",
    label: "平底铣刀",
    imageUrl: "/tool-library/flat-end-mill.png",
  },
];
// #endregion

// #region Left navigation tree
export const NAV_TREE: NavNode[] = [
  {
    id: "workpiece",
    label: "工件",
    children: [
      { id: "workpiece.geometry", label: "工件尺寸" },
      { id: "workpiece.material", label: "材料牌号" },
      { id: "workpiece.probes", label: "刚度测点" },
    ],
  },
  {
    id: "tool",
    label: "刀具",
    children: [{ id: "tool.geometry", label: "刀具参数" }],
  },
  {
    id: "process",
    label: "工艺",
    children: [
      {
        id: "process.roughing",
        label: "粗加工",
        children: [{ id: "process.roughing.first_cut", label: "第一次走刀" }],
      },
    ],
  },
  {
    id: "prediction",
    label: "预测",
    children: [{ id: "prediction.v1", label: "壁厚偏差分析" }],
  },
  {
    id: "compensation",
    label: "补偿",
    children: [
      { id: "compensation.strategy", label: "壁厚补偿方式" },
      { id: "compensation.result", label: "壁厚补偿建议" },
    ],
  },
];

export const DEFAULT_EXPANDED_NAV_IDS = ["workpiece", "tool", "process", "process.roughing", "prediction", "compensation"];
// #endregion
