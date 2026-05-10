import type { KeyPoint, NumericDimensions, ProcessParams } from "../app/types";

import { clamp, parsePositiveNumber } from "./number";

// 前端占位预测模型：后端/Unity 尚未返回真实壁厚误差时，用刚度和工艺参数生成可视化数据。
export function buildLocalPrediction(points: KeyPoint[], dimensions: NumericDimensions, process: ProcessParams) {
  const radialDepth = parsePositiveNumber(process.radialDepth) ?? 1;
  const spindleSpeed = parsePositiveNumber(process.spindleSpeed) ?? 12000;
  const feedRate = parsePositiveNumber(process.feedRate) ?? 720;
  const feedPerRev = feedRate / spindleSpeed;
  const modeFactor = process.cuttingMode === "up_milling" ? 1 : -0.72;

  return points.map((point, index) => {
    const stiffnessFactor = 120 / Math.max(point.stiffness, 1e-9);
    const xPhase = (point.x / Math.max(dimensions.length, 1)) * Math.PI * 2;
    const zFactor = 0.6 + 0.4 * clamp(point.z / Math.max(dimensions.height, 1), 0, 1);
    const wave = Math.sin(xPhase + index * 0.61) * 0.012;
    const error = (radialDepth * 0.018 + feedPerRev * 0.05) * stiffnessFactor * zFactor + modeFactor * 0.006 + wave;
    return {
      ...point,
      error: clamp(error, -0.18, 0.18),
    };
  });
}
