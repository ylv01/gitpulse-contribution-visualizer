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
  FileCode2,
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
import { FormEvent, useCallback, useMemo, useState } from "react";

import { fetchContributions } from "@/lib/api";
import { exportCsv, exportReportPng, exportReportSvg } from "@/lib/export";
import type { Aggregation, AutomationConfig, ContributionResponse } from "@/lib/types";
import AutomationPanel from "./AutomationPanel";
import ActivityChart from "./charts/ActivityChart";
import HeatmapChart from "./charts/HeatmapChart";
import TrendChart from "./charts/TrendChart";
import MetricCard from "./MetricCard";
import SignalDot from "./SignalDot";

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
  const [mode, setMode] = useState<"manual" | "automation">("manual");
  const [data, setData] = useState<ContributionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"svg" | "png" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAutomationConfigLoad = useCallback((config: AutomationConfig) => {
    setUsername(config.username);
    setStartDate(config.start_date);
    setEndDate(config.end_mode === "fixed" && config.end_date ? config.end_date : formatDate(new Date()));
    setAggregation(config.aggregation);
  }, []);

  const handleAutomationError = useCallback((message: string) => setError(message), []);

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
    setExporting("png");
    try {
      await exportReportPng("visual-report", `${data.user.login}-contribution-report.png`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "PNG 导出失败");
    } finally {
      setExporting(null);
    }
  }

  async function handleSvgExport() {
    if (!data) return;
    setExporting("svg");
    try {
      await exportReportSvg(data, `${data.user.login}-contribution-report.svg`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "SVG 导出失败");
    } finally {
      setExporting(null);
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
              href="https://github.com/ylv01/gitpulse-contribution-visualizer"
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
        <section className="relative mb-7 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#080c1d]/65 px-6 py-8 shadow-[0_28px_90px_rgba(0,0,0,.24)] backdrop-blur-xl sm:px-8 lg:px-10 lg:py-9">
          <div className="hero-sheen pointer-events-none absolute -top-px left-[15%] h-px w-[55%] bg-gradient-to-r from-transparent via-cyan/80 to-transparent" />
          <div className="pointer-events-none absolute -left-28 top-1/2 h-60 w-60 -translate-y-1/2 rounded-full bg-blue-600/[0.08] blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-600/[0.11] blur-3xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan/80">
                <Sparkles size={12} />
                Developer intelligence terminal
              </div>
              <h1 className="max-w-3xl text-3xl font-bold leading-[1.12] tracking-[-0.045em] text-white sm:text-4xl lg:text-[48px]">
                把每一次贡献，转化为
                <span className="block bg-gradient-to-r from-cyan via-blue-400 to-violet-400 bg-clip-text text-transparent sm:inline"> 可见的影响力</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
                聚合 GitHub 活动数据，捕捉贡献节奏、持续性与协作画像，并输出清晰锐利的矢量报告。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  ["01", "GraphQL signal"],
                  ["02", "pandas engine"],
                  ["03", "SVG vector export"],
                ].map(([index, label]) => (
                  <span key={label} className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] uppercase tracking-[0.13em] text-slate-500">
                    <span className="font-bold text-cyan/70">{index}</span>{label}
                  </span>
                ))}
              </div>
            </div>
            <SignalRadar />
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
              <ShieldCheck size={13} className="text-emerald-400/60" />
              {mode === "manual" ? "页面 Token 仅用于本次请求；留空时读取后端配置" : "首次配置需输入 Token；保存后写入本地忽略文件"}
            </div>
          </div>

          <div className="mb-5 grid max-w-md grid-cols-2 rounded-xl border border-white/[0.08] bg-[#070a17]/80 p-1">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition ${mode === "manual" ? "bg-cyan/[0.10] text-cyan shadow-[inset_0_0_0_1px_rgba(40,215,255,.16)]" : "text-slate-600 hover:text-slate-300"}`}
            >
              单次生成
            </button>
            <button
              type="button"
              onClick={() => setMode("automation")}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition ${mode === "automation" ? "bg-violet-500/[0.12] text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,.2)]" : "text-slate-600 hover:text-slate-300"}`}
            >
              自动更新
            </button>
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
              <span className="field-label">
                GitHub Token{" "}
                <span className="normal-case tracking-normal text-slate-700">
                  {mode === "manual" ? "(页面输入，或读取 backend/.env)" : "(首次必填；保存后写入本地文件)"}
                </span>
              </span>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  className="input-shell px-10"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder={mode === "manual" ? "输入 Token，或使用后端配置" : "首次配置请输入可写入目标仓库的 Token"}
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
              {loading ? "解析中" : mode === "manual" ? "生成图谱" : "预览图谱"}
              {!loading && <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-700 sm:hidden">
            <ShieldCheck size={12} className="text-emerald-400/60" />
            {mode === "manual" ? "页面输入仅用于本次请求；留空时读取 backend/.env" : "首次配置必填；保存后写入 automation/.env.local"}
          </div>
        </form>

        {mode === "automation" && (
          <AutomationPanel
            username={username}
            token={token}
            startDate={startDate}
            endDate={endDate}
            aggregation={aggregation}
            onLoadConfig={handleAutomationConfigLoad}
            onTokenSaved={() => setToken("")}
            onError={handleAutomationError}
          />
        )}

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
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,215,255,.055),transparent_35%)]" />
            <div className="radar-orbit absolute h-52 w-52 rounded-full border border-dashed border-cyan/[0.08]" />
            <div className="absolute h-72 w-72 rounded-full border border-violet-400/[0.05]" />
            <div className="absolute left-1/2 top-1/2 h-px w-80 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan/[0.08] to-transparent" />
            <div className="absolute left-1/2 top-1/2 h-80 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan/[0.06] to-transparent" />
            <div className="relative">
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-cyan/15 bg-gradient-to-br from-cyan/[0.08] to-violet-500/[0.08] text-cyan shadow-neon">
                <Activity size={25} />
              </div>
              <h2 className="text-lg font-semibold text-slate-300">等待贡献信号</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">填写用户名与时间范围，生成开发者活动的多维可视化报告。</p>
              <div className="mt-5 flex justify-center gap-2">
                {["ACCOUNT", "RANGE", "AGGREGATION"].map((item) => (
                  <span key={item} className="tech-label rounded-full border border-white/[0.055] bg-white/[0.02] px-2.5 py-1 text-[7px] text-slate-700">{item}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {data && (
          <>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                {/* GitHub avatar stays outside the export area to avoid cross-origin image restrictions. */}
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
              <div className="flex flex-wrap gap-2">
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
                  disabled={exporting !== null}
                  className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-[11px] font-medium text-slate-400 transition hover:border-violet-400/20 hover:text-violet-300 disabled:opacity-50"
                >
                  {exporting === "png" ? <LoaderCircle className="animate-spin" size={14} /> : <Download size={14} />} PNG
                </button>
                <button
                  type="button"
                  onClick={handleSvgExport}
                  disabled={exporting !== null}
                  className="flex h-9 items-center gap-2 rounded-xl border border-cyan/25 bg-gradient-to-r from-cyan/[0.10] to-blue-500/[0.09] px-3.5 text-[11px] font-semibold text-cyan shadow-[0_0_22px_rgba(40,215,255,.08)] transition hover:border-cyan/40 hover:brightness-125 disabled:opacity-50"
                >
                  {exporting === "svg" ? <LoaderCircle className="animate-spin" size={14} /> : <FileCode2 size={14} />} 导出 SVG
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-[#050714] p-1">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/[0.055] bg-gradient-to-r from-cyan/[0.045] via-transparent to-violet-500/[0.045] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan/20 bg-cyan/[0.07] text-cyan">
                    <BarChart3 size={15} />
                  </div>
                  <div>
                    <p className="tech-label text-[8px] font-bold text-cyan/70">GITPULSE / VECTOR REPORT</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">@{data.user.login} · {data.meta.start_date} — {data.meta.end_date}</p>
                  </div>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <SignalDot size={18} className="-m-1" />
                  <span className="tech-label text-[7px] text-slate-700">SVG RENDER PIPELINE</span>
                </div>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total contributions" value={data.meta.total_contributions.toLocaleString()} note={`${dateCount} days observed`} icon={Zap} accent="cyan" />
                <MetricCard label="Active days" value={data.meta.active_days.toLocaleString()} note={`${Math.round((data.meta.active_days / Math.max(dateCount, 1)) * 100)}% activity rate`} icon={CalendarDays} accent="blue" />
                <MetricCard label="Longest streak" value={`${data.meta.longest_streak}d`} note="consecutive active days" icon={Activity} accent="violet" />
                <MetricCard label="Collaboration" value={(data.activity.pull_requests + data.activity.issues + data.activity.code_reviews).toLocaleString()} note="PR · issue · review events" icon={Users} accent="cyan" />
              </div>
            </div>

            <div id="visual-report" className="mt-4 rounded-3xl bg-[#050714] p-1">
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

function SignalRadar() {
  return (
    <div className="signal-radar relative hidden h-[230px] overflow-hidden rounded-3xl border border-cyan/[0.10] bg-[#050816]/70 p-5 shadow-[inset_0_0_45px_rgba(40,215,255,.035),0_0_45px_rgba(64,72,255,.06)] lg:block">
      <div className="absolute left-5 top-4 z-10">
        <p className="tech-label text-[8px] font-bold text-cyan/70">CONTRIBUTION SIGNAL</p>
        <p className="mt-1 text-[9px] text-slate-700">Live activity topology</p>
      </div>
      <div className="absolute right-5 top-5 flex items-center gap-1.5">
        <SignalDot size={18} className="-m-1" />
        <span className="tech-label text-[7px] text-cyan/50">SCANNING</span>
      </div>

      <svg className="absolute inset-x-0 bottom-0 h-[205px] w-full" viewBox="0 0 380 205" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="signal-line" x1="46" y1="148" x2="332" y2="57" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2856ff" stopOpacity="0.18" />
            <stop offset="0.48" stopColor="#28d7ff" />
            <stop offset="1" stopColor="#9b5cff" stopOpacity="0.75" />
          </linearGradient>
          <radialGradient id="signal-core">
            <stop stopColor="#8beaff" stopOpacity="0.95" />
            <stop offset="0.25" stopColor="#28d7ff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#28d7ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g opacity="0.34">
          <path d="M22 50H358M22 92H358M22 134H358M22 176H358" stroke="#55709d" strokeOpacity="0.16" />
          <path d="M64 24V187M127 24V187M190 24V187M253 24V187M316 24V187" stroke="#55709d" strokeOpacity="0.13" />
        </g>
        <g className="radar-orbit" opacity="0.8">
          <circle cx="190" cy="108" r="58" stroke="#28d7ff" strokeOpacity="0.16" />
          <circle cx="190" cy="108" r="84" stroke="#8660ff" strokeOpacity="0.10" strokeDasharray="2 8" />
          <path d="M190 24V192M106 108H274" stroke="#28d7ff" strokeOpacity="0.08" />
        </g>
        <path d="M35 159C71 153 84 124 119 131C151 138 159 101 190 106C222 111 239 80 270 88C298 95 316 62 346 52" stroke="url(#signal-line)" strokeWidth="2" />
        <path className="signal-trace" d="M35 159C71 153 84 124 119 131C151 138 159 101 190 106C222 111 239 80 270 88C298 95 316 62 346 52" stroke="#b9f5ff" strokeOpacity="0.8" strokeWidth="1" />
        {[
          [35, 159],
          [119, 131],
          [190, 106],
          [270, 88],
          [346, 52],
        ].map(([cx, cy], index) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={index === 4 ? 16 : 9} fill="url(#signal-core)" />
            <circle cx={cx} cy={cy} r="2.5" fill={index === 4 ? "#d8bcff" : "#72e7ff"} />
          </g>
        ))}
      </svg>

      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
        <div className="flex gap-1">
          {[25, 42, 35, 63, 54, 78, 68].map((height, index) => (
            <span key={index} className="w-1 rounded-full bg-gradient-to-t from-blue-600/35 to-cyan/80" style={{ height: `${height / 4}px` }} />
          ))}
        </div>
        <span className="tech-label text-[7px] text-slate-700">VECTOR OUTPUT / READY</span>
      </div>
    </div>
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
