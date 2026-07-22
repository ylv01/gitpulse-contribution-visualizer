"use client";

import type { EChartsOption } from "echarts";

import type { TrendPoint } from "@/lib/types";
import ChartFrame from "./ChartFrame";
import EChart from "./EChart";

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const option: EChartsOption = {
    animationDuration: 850,
    grid: { left: 44, right: 18, top: 24, bottom: 50 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(7, 10, 23, .96)",
      borderColor: "rgba(40, 215, 255, .24)",
      textStyle: { color: "#dce7f8", fontSize: 12 },
      formatter: (params: unknown) => {
        const items = params as Array<{ dataIndex: number; value: number }>;
        const point = data[items[0]?.dataIndex ?? 0];
        return `<div style="font-size:11px;color:#7f8da8;margin-bottom:5px">${point?.label ?? ""}</div><b style="color:#28d7ff;font-size:15px">${point?.count ?? 0}</b> contributions`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((item) => item.label),
      axisLine: { lineStyle: { color: "rgba(128, 146, 181, .16)" } },
      axisTick: { show: false },
      axisLabel: { color: "#64708a", fontSize: 10, hideOverlap: true, margin: 16 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitNumber: 4,
      axisLabel: { color: "#64708a", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(128, 146, 181, .09)", type: "dashed" } },
    },
    series: [
      {
        name: "Contributions",
        type: "line",
        data: data.map((item) => item.count),
        smooth: 0.28,
        showSymbol: data.length < 45,
        symbolSize: 5,
        lineStyle: {
          width: 2.5,
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#25d9ff" },
              { offset: 0.55, color: "#58c8ff" },
              { offset: 1, color: "#9b7cff" },
            ],
          },
          shadowBlur: 12,
          shadowColor: "rgba(49,207,255,.38)",
        },
        itemStyle: { color: "#77e7ff", borderColor: "#07101e", borderWidth: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(40, 215, 255, .28)" },
              { offset: 0.55, color: "rgba(76, 103, 255, .10)" },
              { offset: 1, color: "rgba(76, 103, 255, 0)" },
            ],
          },
        },
        emphasis: { focus: "series" },
      },
      {
        id: "trend-flow-highlight",
        name: "Flow highlight",
        type: "line",
        data: data.map((item) => item.count),
        smooth: 0.28,
        showSymbol: false,
        silent: true,
        z: 12,
        animation: false,
        lineStyle: {
          width: 2.2,
          color: "#d5fbff",
          type: [5, 11, 24, 17],
          cap: "round",
          opacity: 0.84,
          shadowBlur: 7,
          shadowColor: "rgba(117, 235, 255, .72)",
        },
        emphasis: { disabled: true },
      },
    ],
  };

  return (
    <ChartFrame
      eyebrow="Signal / 01"
      title="贡献趋势"
      description="选定时间窗内的贡献强度变化 · 霓虹光泽沿时间方向持续流动"
      className="lg:col-span-2"
    >
      <EChart className="trend-flow-chart export-trend-chart" option={option} height={300} />
    </ChartFrame>
  );
}
