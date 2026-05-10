import type { KeyPoint, KeyPointSummary, WorkpieceForm } from "../app/types";

import { parsePositiveNumber } from "./number";

// 表单里保存的是字符串；进入场景生成、预览或后端接口前统一在这里转成数值尺寸。
export function parseDimensions(form: WorkpieceForm) {
  const length = parsePositiveNumber(form.length);
  const height = parsePositiveNumber(form.height);
  const thickness = parsePositiveNumber(form.thickness);
  const baseWidth = parsePositiveNumber(form.baseWidth);
  const baseHeight = parsePositiveNumber(form.baseHeight);
  const issues: string[] = [];

  if (length == null) issues.push("工件长度 l 需要为正数。");
  if (height == null) issues.push("工件高度 h1 需要为正数。");
  if (thickness == null) issues.push("工件厚度 t 需要为正数。");
  if (baseWidth == null) issues.push("底座宽度 w 需要为正数。");
  if (baseHeight == null) issues.push("底座高度 h2 需要为正数。");

  if (height != null && baseHeight != null && baseHeight >= height) {
    issues.push("底座高度 h2 必须小于工件总高度 h1。");
  }
  if (thickness != null && baseWidth != null && thickness > baseWidth) {
    issues.push("工件厚度 t 不能大于底座宽度 w。");
  }

  if (issues.length || length == null || height == null || thickness == null || baseWidth == null || baseHeight == null) {
    return { dimensions: null, issues };
  }

  return {
    dimensions: {
      length,
      height,
      thickness,
      baseWidth,
      baseHeight,
      wallHeight: height - baseHeight,
    },
    issues,
  };
}

// 多处 UI 都依赖这份统计结果，不要在面板组件里重复计算平均误差。
export function getKeyPointSummary(points: KeyPoint[]): KeyPointSummary {
  const errors = points.map((point) => point.error).filter((value): value is number => Number.isFinite(value));
  if (!errors.length) {
    return {
      pointCount: points.length,
      errorCount: 0,
      minError: null,
      maxError: null,
      averageError: null,
      maxAbsError: 0,
    };
  }

  const minError = Math.min(...errors);
  const maxError = Math.max(...errors);
  const averageError = errors.reduce((sum, value) => sum + value, 0) / errors.length;

  return {
    pointCount: points.length,
    errorCount: errors.length,
    minError,
    maxError,
    averageError,
    maxAbsError: Math.max(Math.abs(minError), Math.abs(maxError)),
  };
}
