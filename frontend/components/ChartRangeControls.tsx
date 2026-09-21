"use client";

import type { Aggregation, ChartRange } from "@/lib/types";

interface Props {
  title: string;
  value: ChartRange | null;
  onChange: (value: ChartRange | null) => void;
  startDate: string;
  endDate: string;
}

export default function ChartRangeControls({ title, value, onChange, startDate, endDate }: Props) {
  const current: ChartRange = value ?? { mode: "recent", unit: "week", count: 5 };
  return (
    <fieldset className="rounded-xl border border-white/[0.08] bg-[#070a17]/70 p-4">
      <legend className="px-1 text-xs text-cyan">{title}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label={`${title}范围模式`} className="input-shell !w-auto" value={value?.mode ?? "shared"}
          onChange={(event) => onChange(event.target.value === "shared" ? null : {
            ...current, mode: event.target.value as ChartRange["mode"],
            start_date: current.start_date ?? startDate, end_date: current.end_date ?? endDate,
          })}>
          <option value="shared">使用上方日期</option>
          <option value="recent">最近 N 天 / 周 / 月</option>
          <option value="custom">独立起止日期</option>
        </select>
        {value?.mode === "recent" && <>
          <input aria-label={`${title}范围数量`} type="number" min={1} max={{day: 3653, week: 521, month: 120}[value.unit]}
            required className="input-shell !w-20" value={value.count}
            onChange={(event) => onChange({ ...value, count: Number(event.target.value) })} />
          <select aria-label={`${title}范围单位`} className="input-shell !w-auto" value={value.unit}
            onChange={(event) => onChange({ ...value, unit: event.target.value as Aggregation })}>
            <option value="day">天</option><option value="week">周</option><option value="month">月</option>
          </select>
        </>}
        {value?.mode === "custom" && <>
          <input aria-label={`${title}开始日期`} type="date" required className="input-shell !w-auto"
            value={value.start_date ?? startDate} onChange={(event) => onChange({ ...value, start_date: event.target.value })} />
          <span className="text-slate-600">—</span>
          <input aria-label={`${title}结束日期`} type="date" required className="input-shell !w-auto"
            value={value.end_date ?? endDate} onChange={(event) => onChange({ ...value, end_date: event.target.value })} />
        </>}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">最近范围截至上方结束日期，含当周 / 当月。热力图始终按日着色。</p>
    </fieldset>
  );
}
