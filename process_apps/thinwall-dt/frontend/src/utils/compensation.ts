import type { CompensationMethod, KeyPoint } from "../app/types";

// 前端补偿 fallback：接口未接通时仍能跑通流程；正式算法建议在后端固化后替换这里。
export function calculateLocalSuggestion(method: CompensationMethod, radialDepth: number, points: KeyPoint[]) {
  if (!method) {
    throw new Error("请先选择补偿方式。");
  }

  const errorValues = points.map((point) => point.error).filter((value): value is number => Number.isFinite(value));
  if (!errorValues.length) {
    throw new Error("请先完成误差预测。");
  }

  const averageError = errorValues.reduce((sum, value) => sum + value, 0) / errorValues.length;
  if (method === "mirror") {
    return { suggestion: -averageError, averageError };
  }

  if (Math.abs(radialDepth - averageError) < 1e-12) {
    throw new Error("径向切深与平均误差过于接近，无法计算补偿值。");
  }

  const m = radialDepth / (radialDepth - averageError);
  if (method === "first_order") {
    return { suggestion: -(m * averageError), averageError };
  }

  const stiffnessValues = points.map((point) => point.stiffness).filter(Number.isFinite);
  const averageStiffness = stiffnessValues.reduce((sum, value) => sum + value, 0) / stiffnessValues.length;
  const denominator = 1 - averageStiffness / (averageStiffness * 0.85) + m;
  if (Math.abs(denominator) < 1e-12) {
    throw new Error("补偿分母过小，无法计算补偿值。");
  }

  return { suggestion: -(m / denominator) * averageError, averageError };
}
