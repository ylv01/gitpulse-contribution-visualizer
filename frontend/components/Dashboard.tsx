"use client";

import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Github,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { fetchContributions } from "@/lib/api";
import { exportCsv, exportReportPng } from "@/lib/export";
import type { Aggregation, ContributionResponse } from "@/lib/types";
import ActivityChart from "./charts/ActivityChart";
import HeatmapChart from "./charts/HeatmapChart";
import TrendChart from "./charts/TrendChart";
import MetricCard from "./MetricCard";

function formatDate(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(end.getFullYear() - 1);
  start.setDate(start.getDate() + 1);
  return { start: formatDate(start), end: formatDate(end) };
}

const aggregationOptions: Array<{ value: Aggregation; label: string }> = [
  { value: "day", label: "按日" },
  { value: "week", label: "按周" },
  { value: "month", label: "按月" },
];

export default function Dashboard() {
  const initialRange = useMemo(defaultRange, []);
  const [username, setUsername] = useState("torvalds");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [aggregation, setAggregation] = useState<Aggregation>("week");
  const [data, setData] = useState<ContributionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (startDate > endDate) {
      setError("开始日期不能晚于结束日期");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchContributions({
        username: username.trim(),
        token: token.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        aggregation,
      });
      setData(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handlePngExport() {
    if (!data) return;
    setExporting(true);
    try {
      await exportReportPng("visual-report", `${data.user.login}-contribution-report.png`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "PNG 导出失败");
    } finally {
      setExporting(false);
    }
  }

  const dateCount = data
    ? Math.floor((new Date(data.meta.end_date).getTime() - new Date(data.meta.start_date).getTime()) / 86_400_000) + 1
    : 0;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute left-[18%] top-0 h-px w-[64%] bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />

      <header className="border-b border-white/[0.055] bg-[#050714]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-cyan/25 bg-gradient-to-br from-cyan/15 to-violet-500/15 shadow-[0_0_28px_rgba(40,215,255,.15)]">
              <BarChart3 className="text-cyan" size={20} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#050714] bg-violet-400 shadow-[0_0_8px_#a78bfa]" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-bold tracking-tight text-white">GitPulse</span>
                <span className="tech-label hidden text-[8px] font-bold text-cyan/70 sm:block">VISUALIZER</span>
              </div>
              <p className="text-[10px] tracking-wide text-slate-600">GitHub Contribution Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-1.5 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_7px_#34d399]" />
              <span className="tech-label text-[8px] font-bold text-emerald-300/70">GRAPHQL READY</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-500 transition hover:border-white/[0.15] hover:text-white"
              aria-label="GitHub"
            >
              <Github size={17} />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 pb-16 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <section className="mb-7 grid items-end gap-5 md:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan/75">
              <Sparkles size={12} />
              Developer analytics console
            </div>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-[-0.035em] text-white sm:text-4xl lg:text-[44px]">
              把每一次贡献，转化为
              <span className="bg-gradient-to-r from-cyan via-blue-400 to-violet-400 bg-clip-text text-transparent"> 可见的影响力</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              聚合 GitHub 活动数据，观察贡献节奏、持续性与协作画像。
            </p>
          </div>
          <div className="hidden grid-cols-3 divide-x divide-white/[0.07] rounded-2xl border border-white/[0.06] bg-white/[0.025] px-2 py-3 lg:grid">
            {[["API", "GraphQL"], ["ENGINE", "pandas"], ["RENDER", "ECharts"]].map(([label, value]) => (
              <div className="px-5" key={label}>
                <p className="tech-label text-[8px] text-slate-700">{label}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="glass-panel relative mb-7 overflow-hidden rounded-2xl p-5 sm:p-6">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan/0 via-cyan/45 to-violet-500/0" />
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan/15 bg-cyan/[0.06] text-cyan">
                <Search size={15} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">查询参数</h2>
                <p className="text-[10px] text-slate-600">Configure data scope</p>
              </div>
            </div>
            <div className="hidden items-center gap-1.5 text-[10px] text-slate-600 sm:flex">
              <ShieldCheck size={13} className="text-emerald-400/60" /> Token 仅用于本次请求，不会持久化
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1.25fr_.9fr_.9fr_1.05fr_auto] xl:items-end">
            <label>
              <span className="field-label">GitHub username</span>
              <div className="relative">
                <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                <input
                  className="input-shell pl-10"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="octocat"
                  autoComplete="off"
                  required
                />
              </div>
            </label>

            <label>
              <span className="field-label">GitHub token <span className="normal-case tracking-normal text-slate-700">(可选)</span></span>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  className="input-shell px-10"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="ghp_••••••••"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-slate-300"
                  aria-label={showToken ? "隐藏 Token" : "显示 Token"}
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            <label>
              <span className="field-label">Start date</span>
              <input className="input-shell" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            </label>

            <label>
              <span className="field-label">End date</span>
              <input className="input-shell" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
            </label>

            <fieldset>
              <legend className="field-label">Aggregation</legend>
              <div className="grid h-11 grid-cols-3 rounded-xl border border-white/[0.08] bg-[#070a17]/90 p-1">
                {aggregationOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setAggregation(option.value)}
                    className={`rounded-lg text-xs font-medium transition ${
                      aggregation === option.value
                        ? "bg-gradient-to-r from-blue-500/25 to-violet-500/25 text-cyan shadow-[inset_0_0_0_1px_rgba(40,215,255,.2)]"
                        : "text-slate-600 hover:text-slate-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={loading}
              className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-xs font-semibold text-white shadow-[0_0_25px_rgba(73,89,255,.25)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60 md:col-span-2 xl:col-span-1"
            >
              {loading ? <LoaderCircle className="animate-spin" size={15} /> : <Zap size={15} fill="currentColor" />}
              {loading ? "解析中" : "生成图谱"}
              {!loading && <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-700 sm:hidden">
            <ShieldCheck size={12} className="text-emerald-400/60" /> Token 仅用于本次请求，不会持久化
          </div>
        </form>

        {error && (
          <div className="mb-7 flex items-start justify-between gap-4 rounded-2xl border border-rose-400/15 bg-rose-400/[0.055] px-4 py-3.5 text-sm text-rose-200/85">
            <div className="flex gap-2.5">
              <CircleDot className="mt-0.5 shrink-0 text-rose-400" size={16} />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-xs text-rose-300/50 hover:text-rose-200">关闭</button>
          </div>
        )}

        {loading && !data && <LoadingState />}

        {!data && !loading && (
          <section className="glass-panel relative grid min-h-[360px] place-items-center overflow-hidden rounded-2xl px-6 text-center">
            <div className="absolute h-52 w-52 rounded-full border border-cyan/[0.06]" />
            <div className="absolute h-72 w-72 rounded-full border border-violet-400/[0.04]" />
            <div className="relative">
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-cyan/15 bg-gradient-to-br from-cyan/[0.08] to-violet-500/[0.08] text-cyan shadow-neon">
                <Activity size={25} />
              </div>
              <h2 className="text-lg font-semibold text-slate-300">等待贡献信号</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">填写用户名与时间范围，生成开发者活动的多维可视化报告。</p>
            </div>
          </section>
        )}

        {data && (
          <>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                {/* GitHub avatar is intentionally outside the export area to avoid cross-origin canvas restrictions. */}
                <img src={data.user.avatar_url} alt={data.user.login} className="h-11 w-11 rounded-xl border border-white/10 bg-slate-900" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-100">{data.user.name || data.user.login}</h2>
                    <Check size={13} className="rounded-full bg-blue-500 p-0.5 text-white" />
                  </div>
                  <a href={data.user.profile_url} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600 transition hover:text-cyan">
                    @{data.user.login} <ArrowUpRight size={10} />
                  </a>
                </div>
                <span className="hidden h-7 w-px bg-white/[0.07] sm:block" />
                <p className="hidden text-[10px] text-slate-600 sm:block">{data.meta.start_date} — {data.meta.end_date}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportCsv(data)}
                  className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-[11px] font-medium text-slate-400 transition hover:border-cyan/20 hover:text-cyan"
                >
                  <FileSpreadsheet size={14} /> 导出 CSV
                </button>
                <button
                  type="button"
                  onClick={handlePngExport}
                  disabled={exporting}
                  className="flex h-9 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/[0.07] px-3.5 text-[11px] font-medium text-violet-300 transition hover:bg-violet-500/[0.12] disabled:opacity-50"
                >
                  {exporting ? <LoaderCircle className="animate-spin" size={14} /> : <Download size={14} />} 导出 PNG
                </button>
              </div>
            </div>

            <div id="visual-report" className="rounded-3xl bg-[#050714] p-1">
              <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total contributions" value={data.meta.total_contributions.toLocaleString()} note={`${dateCount} days observed`} icon={Zap} accent="cyan" />
                <MetricCard label="Active days" value={data.meta.active_days.toLocaleString()} note={`${Math.round((data.meta.active_days / Math.max(dateCount, 1)) * 100)}% activity rate`} icon={CalendarDays} accent="blue" />
                <MetricCard label="Longest streak" value={`${data.meta.longest_streak}d`} note="consecutive active days" icon={Activity} accent="violet" />
                <MetricCard label="Collaboration" value={(data.activity.pull_requests + data.activity.issues + data.activity.code_reviews).toLocaleString()} note="PR · issue · review events" icon={Users} accent="cyan" />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <TrendChart data={data.trend} />
                <ActivityChart activity={data.activity} />
                <HeatmapChart data={data.daily} />
              </div>
            </div>

            {data.meta.restricted_contributions > 0 && (
              <p className="mt-4 text-center text-[10px] text-slate-700">
                该区间另有 {data.meta.restricted_contributions} 次私有贡献；GitHub 不提供其活动明细。
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => <div className="skeleton-shimmer h-28 rounded-2xl border border-white/[0.04]" key={index} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="skeleton-shimmer h-[380px] rounded-2xl border border-white/[0.04] lg:col-span-2" />
        <div className="skeleton-shimmer h-[380px] rounded-2xl border border-white/[0.04]" />
        <div className="skeleton-shimmer h-[300px] rounded-2xl border border-white/[0.04] lg:col-span-3" />
      </div>
      <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-slate-600">
        <RefreshCw className="animate-spin" size={12} /> 正在同步 GitHub GraphQL 数据并完成 pandas 聚合…
      </div>
    </div>
  );
}

