"use client";

import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-full w-full rounded-xl" />,
});

interface EChartProps {
  option: object;
  height?: number;
}

export default function EChart({ option, height = 320 }: EChartProps) {
  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height, width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}
