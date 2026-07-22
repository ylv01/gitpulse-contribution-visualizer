"use client";

import type { EChartsOption } from "echarts";

import type { ActivityBreakdown } from "@/lib/types";
import ChartFrame from "./ChartFrame";
import EChart from "./EChart";

const COLORS = ["#28d7ff", "#5a7cff", "#8b5cf6", "#d053ff"];

export default function ActivityChart({ activity }: { activity: ActivityBreakdown }) {
  const entries = [
    { name: "Commits", value: activity.commits },
    { name: "Pull requests", value: activity.pull_requests },
    { name: "Issues", value: activity.issues },
    { name: "Code reviews", value: activity.code_reviews },
  ];
  const total = entries.reduce((sum, item) => sum + item.value, 0);
  const option: EChartsOption = {
    color: COLORS,
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(7, 10, 23, .96)",
      borderColor: "rgba(139, 92, 246, .3)",
      textStyle: { color: "#dce7f8", fontSize: 12 },
      formatter: "{b}<br/><b>{c}</b> · {d}%",
    },
    title: {
      text: total.toLocaleString(),
      subtext: "ACTIVITIES",
      left: "35%",
      top: "38%",
      textAlign: "center",
      textStyle: { color: "#edf4ff", fontSize: 24, fontWeight: 700 },
      subtextStyle: { color: "#66728d", fontSize: 9 },
    },
    legend: {
      orient: "vertical",
      right: "1%",
      top: "middle",
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 18,
      icon: "circle",
      textStyle: { color: "#8a96af", fontSize: 11 },
      formatter: (name: string) => {
        const value = entries.find((item) => item.name === name)?.value ?? 0;
        return `${name}   ${value}`;
      },
    },
    series: [
      {
        type: "pie",
        radius: ["53%", "76%"],
        center: ["35%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: "#090d1e", borderWidth: 4, borderRadius: 5 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 7 },
        data: entries,
      },
    ],
  };

  return (
    <ChartFrame
      eyebrow="Signal / 02"
      title="活动类型分布"
      description="公开活动的构成与协作偏好"
      accent="violet"
    >
      {total > 0 ? (
        <EChart option={option} height={300} />
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-600">该时间段暂无分类活动</div>
      )}
    </ChartFrame>
  );
}
