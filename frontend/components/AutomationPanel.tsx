"use client";

import { Bot, ExternalLink, HardDrive, LoaderCircle, Play, Save, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";

import { deleteAutomationToken, fetchAutomationConfig, runAutomation, saveAutomationConfig } from "@/lib/api";
import type { Aggregation, AutomationConfig, AutomationEndMode } from "@/lib/types";

interface AutomationPanelProps {
  username: string;
  token: string;
  startDate: string;
  endDate: string;
  aggregation: Aggregation;
  onLoadConfig: (config: AutomationConfig) => void;
  onTokenSaved: () => void;
  onError: (message: string) => void;
}

const DEFAULT_CONFIG: AutomationConfig = {
  enabled: false,
  username: "ylv01",
  start_date: "2026-06-01",
  end_mode: "today",
  end_date: null,
  aggregation: "month",
  schedule_time: "09:00",
  time_zone: "Asia/Shanghai",
  require_proxy: true,
  target_repository: "ylv01/ylv01",
  target_branch: "main",
  target_path: "others_show/ylv01-contribution-report.svg",
};

export default function AutomationPanel({
  username,
  token,
  startDate,
  endDate,
  aggregation,
  onLoadConfig,
  onTokenSaved,
  onError,
}: AutomationPanelProps) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [busy, setBusy] = useState<"save" | "generate" | "push" | "delete" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [commitUrl, setCommitUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchAutomationConfig()
      .then((response) => {
        setConfig(response.config);
        setTokenConfigured(response.token_configured);
        onLoadConfig(response.config);
      })
      .catch((error) => onError(error instanceof Error ? error.message : "无法读取自动化配置"));
  }, [onError, onLoadConfig]);

  function currentConfig(): AutomationConfig {
    return {
      ...config,
      username: username.trim(),
      start_date: startDate,
      end_date: config.end_mode === "fixed" ? endDate : null,
      aggregation,
    };
  }

  async function persist(): Promise<void> {
    const response = await saveAutomationConfig(currentConfig(), token);
    setConfig(response.config);
    setTokenConfigured(response.token_configured);
    if (token.trim()) onTokenSaved();
  }

  async function handleSave() {
    setBusy("save");
    setStatus(null);
    setCommitUrl(null);
    try {
      await persist();
      setStatus("自动化配置已保存。Token 仅在自动模式下写入本地忽略文件。");
    } catch (error) {
      onError(error instanceof Error ? error.message : "保存自动化配置失败");
    } finally {
      setBusy(null);
    }
  }

  async function handleRun(push: boolean) {
    setBusy(push ? "push" : "generate");
    setStatus(null);
    setCommitUrl(null);
    try {
      await persist();
      const result = await runAutomation(push);
      setStatus(result.output_path ? `${result.message} ${result.output_path}` : result.message);
      setCommitUrl(result.commit_url ?? null);
    } catch (error) {
      onError(error instanceof Error ? error.message : push ? "立即推送失败" : "测试生成失败");
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteToken() {
    setBusy("delete");
    try {
      await deleteAutomationToken();
      setTokenConfigured(false);
      setStatus("已删除本地自动化 Token。单次生成功能不受影响。");
    } catch (error) {
      onError(error instanceof Error ? error.message : "删除 Token 失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="glass-panel relative mb-7 overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-500/0 via-violet-400/50 to-cyan/0" />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-violet-400/20 bg-violet-500/[0.08] text-violet-300">
            <Bot size={17} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">自动更新配置</h2>
            <p className="mt-0.5 text-[10px] text-slate-600">可选功能 · 单纯测试无需启用</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <ShieldCheck size={13} className={tokenConfigured ? "text-emerald-400" : "text-slate-600"} />
          <span className={tokenConfigured ? "text-emerald-300/80" : "text-slate-600"}>
            {tokenConfigured ? "自动化 Token 已保存" : "尚未保存自动化 Token"}
          </span>
          {tokenConfigured && (
            <button type="button" onClick={handleDeleteToken} disabled={busy !== null} className="ml-1 text-slate-600 transition hover:text-rose-300">
              {busy === "delete" ? <LoaderCircle className="animate-spin" size={12} /> : <Trash2 size={12} />}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="field-label">End date mode</span>
          <select className="input-shell" value={config.end_mode} onChange={(event) => setConfig((value) => ({ ...value, end_mode: event.target.value as AutomationEndMode }))}>
            <option value="today">固定开始日期 → 当天</option>
            <option value="fixed">使用上方固定结束日期</option>
          </select>
        </label>
        <label>
          <span className="field-label">Schedule time</span>
          <input className="input-shell" type="time" value={config.schedule_time} onChange={(event) => setConfig((value) => ({ ...value, schedule_time: event.target.value }))} />
        </label>
        <label>
          <span className="field-label">Target repository</span>
          <input className="input-shell" value={config.target_repository} onChange={(event) => setConfig((value) => ({ ...value, target_repository: event.target.value }))} placeholder="owner/repository" />
        </label>
        <label>
          <span className="field-label">Target branch</span>
          <input className="input-shell" value={config.target_branch} onChange={(event) => setConfig((value) => ({ ...value, target_branch: event.target.value }))} placeholder="main" />
        </label>
        <label className="md:col-span-2 xl:col-span-3">
          <span className="field-label">SVG path</span>
          <input className="input-shell font-mono text-xs" value={config.target_path} onChange={(event) => setConfig((value) => ({ ...value, target_path: event.target.value }))} placeholder="others_show/report.svg" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.07] bg-[#070a17]/75 px-3 text-xs text-slate-400">
            <input type="checkbox" checked={config.enabled} onChange={(event) => setConfig((value) => ({ ...value, enabled: event.target.checked }))} className="accent-cyan" />
            启用每日任务
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.07] bg-[#070a17]/75 px-3 text-xs text-slate-400">
            <input type="checkbox" checked={config.require_proxy} onChange={(event) => setConfig((value) => ({ ...value, require_proxy: event.target.checked }))} className="accent-cyan" />
            需要代理
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl text-[10px] leading-5 text-slate-600">
          “仅生成测试”只写入本机 <code className="text-slate-500">automation/generated</code>；“立即推送”会正常提交并覆盖目标 SVG，不会强推 Git 历史。每日计划任务需在本机执行一次注册脚本。
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSave} disabled={busy !== null} className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 text-[11px] text-slate-400 transition hover:text-white disabled:opacity-50">
            {busy === "save" ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />} 保存配置
          </button>
          <button type="button" onClick={() => handleRun(false)} disabled={busy !== null} className="flex h-9 items-center gap-2 rounded-xl border border-cyan/20 bg-cyan/[0.05] px-3.5 text-[11px] text-cyan transition hover:bg-cyan/[0.09] disabled:opacity-50">
            {busy === "generate" ? <LoaderCircle className="animate-spin" size={14} /> : <HardDrive size={14} />} 仅生成测试
          </button>
          <button type="button" onClick={() => handleRun(true)} disabled={busy !== null} className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-3.5 text-[11px] font-semibold text-white shadow-[0_0_20px_rgba(73,89,255,.2)] transition hover:brightness-110 disabled:opacity-50">
            {busy === "push" ? <LoaderCircle className="animate-spin" size={14} /> : <UploadCloud size={14} />} 立即推送
          </button>
        </div>
      </div>

      {status && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-2.5 text-[11px] text-emerald-200/75">
          <Play size={13} /> {status}
          {commitUrl && <a href={commitUrl} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-cyan hover:underline">查看提交 <ExternalLink size={11} /></a>}
        </div>
      )}
    </section>
  );
}
