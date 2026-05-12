import { useEffect, useRef } from "react";

import { Box, Typography } from "@mui/material";
import * as echarts from "echarts";

import { BLUE_NEGATIVE, BORDER, PRIMARY, RED_POSITIVE, TEXT_SECONDARY } from "../../app/constants";
import type { KeyPoint } from "../../app/types";

// ECharts 只绘制已经带 error 的点；刚度刚上传但未预览完成时会显示空态。
function buildPointErrors(points: KeyPoint[]) {
  return points
    .filter((point) => Number.isFinite(point.error))
    .map((point, index) => ({
      index: index + 1,
      id: point.id,
      error: point.error ?? 0,
    }));
}

type TooltipRow = {
  axisValueLabel?: string;
  marker?: string;
  name?: string;
  seriesName?: string;
  value?: unknown;
};

function isTooltipRow(value: unknown): value is TooltipRow {
  return typeof value === "object" && value !== null;
}

function formatTooltipValue(value: unknown) {
  const numericValue = Array.isArray(value) ? Number(value[value.length - 1]) : Number(value);
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(4)} mm` : "-";
}

function formatTooltip(params: unknown) {
  const rows = (Array.isArray(params) ? params : [params]).filter(isTooltipRow);
  const title = rows[0]?.axisValueLabel ?? rows[0]?.name ?? "";
  const body = rows
    .map((row) => {
      const marker = row.marker ?? "";
      const label = row.seriesName ?? "";
      return `<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">
        <span>${marker}${label}</span>
        <strong style="font-weight:600;">${formatTooltipValue(row.value)}</strong>
      </div>`;
    })
    .join("");
  return `<div style="font-size:11px;line-height:1.35;">
    <div style="margin-bottom:3px;font-weight:600;">${title}</div>
    ${body}
  </div>`;
}

export function ErrorCurveChart({
  points,
  averageError,
  compensationValue,
}: {
  points: KeyPoint[];
  averageError: number | null;
  compensationValue?: number | null;
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return undefined;

    const chart = echarts.init(element, undefined, { renderer: "canvas" });
    const rows = buildPointErrors(points);
    const xData = rows.map((row) => row.id || String(row.index));
    const errorData = rows.map((row) => row.error);
    const averageData = rows.map(() => averageError ?? 0);
    const compensationData = rows.map(() => compensationValue ?? 0);

    chart.setOption({
      grid: { left: 42, right: 18, top: 18, bottom: 34 },
      tooltip: {
        trigger: "axis",
        appendTo: document.body,
        confine: false,
        padding: [5, 7],
        borderWidth: 1,
        textStyle: { fontSize: 11, lineHeight: 15 },
        extraCssText: "z-index:2147483647;max-width:180px;border-radius:4px;box-shadow:0 6px 18px rgba(16,38,56,0.16);pointer-events:none;",
        formatter: formatTooltip,
      },
      xAxis: {
        type: "category",
        data: xData,
        axisLabel: { color: TEXT_SECONDARY, fontSize: 10 },
        axisLine: { lineStyle: { color: BORDER } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: TEXT_SECONDARY, fontSize: 10 },
        splitLine: { lineStyle: { color: "#e5edf2" } },
      },
      series: [
        {
          name: "误差",
          type: "line",
          data: errorData,
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2.2, color: PRIMARY },
          itemStyle: { color: PRIMARY },
          areaStyle: { color: "rgba(0,107,143,0.08)" },
        },
        ...(averageError == null
          ? []
          : [
              {
                name: "平均壁厚偏差",
                type: "line",
                data: averageData,
                symbol: "none",
                lineStyle: { width: 1.6, color: RED_POSITIVE, type: "dashed" },
              },
            ]),
        ...(compensationValue == null
          ? []
          : [
              {
                name: "补偿量",
                type: "line",
                data: compensationData,
                symbol: "none",
                lineStyle: { width: 1.6, color: BLUE_NEGATIVE, type: "dashed" },
              },
            ]),
      ],
    });

    const resize = () => chart.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [averageError, compensationValue, points]);

  const hasData = points.some((point) => Number.isFinite(point.error));

  return (
    <Box sx={{ position: "relative", height: 190, border: `1px solid ${BORDER}`, borderRadius: 1, backgroundColor: "#fbfdfe", overflow: "hidden" }}>
      <Box ref={chartRef} sx={{ width: "100%", height: "100%" }} />
      {!hasData && (
        <Typography sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: TEXT_SECONDARY, fontSize: 12.5 }}>
          暂无预测曲线
        </Typography>
      )}
    </Box>
  );
}
