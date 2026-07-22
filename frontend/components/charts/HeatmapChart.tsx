"use client";

import type { CalendarComponentOption, EChartsOption, HeatmapSeriesOption } from "echarts";

import type { ContributionDay } from "@/lib/types";
import ChartFrame from "./ChartFrame";
import EChart from "./EChart";

export default function HeatmapChart({ data }: { data: ContributionDay[] }) {
  const years = Array.from(new Set(data.map((item) => item.date.slice(0, 4)))).sort();
  const calendarHeight = 148;
  const chartHeight = Math.max(218, years.length * calendarHeight + 74);

  const calendars: CalendarComponentOption[] = years.map((year, index) => {
    const dates = data.filter((item) => item.date.startsWith(year)).map((item) => item.date);
    return {
      top: 34 + index * calendarHeight,
      left: 58,
      right: 22,
      range: [dates[0], dates[dates.length - 1]],
      cellSize: ["auto", 14],
      splitLine: { show: false },
      itemStyle: { color: "#0c1123", borderColor: "#060817", borderWidth: 3 },
      yearLabel: {
        show: true,
        position: "left",
        margin: 38,
        color: "#6f7c98",
        fontSize: 11,
      },
      dayLabel: {
        firstDay: 0,
        nameMap: ["日", "一", "二", "三", "四", "五", "六"],
        color: "#58647d",
        fontSize: 9,
      },
      monthLabel: { color: "#66738e", fontSize: 9, margin: 8 },
    };
  });

  const series: HeatmapSeriesOption[] = years.map((year, index) => ({
    type: "heatmap",
    coordinateSystem: "calendar",
    calendarIndex: index,
    data: data.filter((item) => item.date.startsWith(year)).map((item) => [item.date, item.count]),
    emphasis: { itemStyle: { borderColor: "#bcefff", borderWidth: 1, shadowBlur: 8, shadowColor: "#28d7ff" } },
  }));

  const option: EChartsOption = {
    animationDuration: 600,
    tooltip: {
      backgroundColor: "rgba(7, 10, 23, .96)",
      borderColor: "rgba(40, 215, 255, .24)",
      textStyle: { color: "#dce7f8", fontSize: 12 },
      formatter: (params: unknown) => {
        const item = params as { data: [string, number] };
        return `<b style="color:#28d7ff">${item.data[1]}</b> contributions<br/><span style="color:#7f8da8">${item.data[0]}</span>`;
      },
    },
    visualMap: {
      type: "piecewise",
      orient: "horizontal",
      right: 22,
      top: 0,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 3,
      text: ["HIGH", "LOW"],
      textStyle: { color: "#59657e", fontSize: 8 },
      pieces: [
        { min: 10, color: "#c058ff" },
        { min: 6, max: 9, color: "#765cff" },
        { min: 3, max: 5, color: "#366ff2" },
        { min: 1, max: 2, color: "#174285" },
        { value: 0, color: "#0c1123" },
      ],
    },
    calendar: calendars,
    series,
  };

  return (
    <ChartFrame
      eyebrow="Signal / 03"
      title="贡献热力图"
      description="GitHub 风格日历矩阵，颜色越亮表示贡献越集中"
      className="lg:col-span-3"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[780px]">
          <EChart option={option} height={chartHeight} />
        </div>
      </div>
    </ChartFrame>
  );
}

