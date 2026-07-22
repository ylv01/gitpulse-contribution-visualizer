import type { ContributionResponse } from "./types";

function quote(value: string | number): string {
  const normalized = String(value);
  return /[",\n]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
}

function download(content: BlobPart, mime: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(data: ContributionResponse): void {
  const lines: string[] = [
    "DAILY CONTRIBUTIONS",
    "date,contribution_count",
    ...data.daily.map((item) => `${quote(item.date)},${item.count}`),
    "",
    `AGGREGATED TREND (${data.meta.aggregation.toUpperCase()})`,
    "label,start_date,end_date,contribution_count",
    ...data.trend.map((item) =>
      [item.label, item.start_date, item.end_date, item.count].map(quote).join(","),
    ),
    "",
    "ACTIVITY BREAKDOWN",
    "activity_type,count",
    `commits,${data.activity.commits}`,
    `pull_requests,${data.activity.pull_requests}`,
    `issues,${data.activity.issues}`,
    `code_reviews,${data.activity.code_reviews}`,
  ];

  download(`\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8", `${data.user.login}-contributions.csv`);
}

export async function exportReportPng(elementId: string, filename: string): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) throw new Error("找不到可导出的图表区域");
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#050714",
  });
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = dataUrl;
  anchor.click();
}

export async function exportReportSvg(elementId: string, filename: string): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) throw new Error("找不到可导出的图表区域");
  const { toSvg } = await import("html-to-image");
  const dataUrl = await toSvg(node, {
    cacheBust: true,
    backgroundColor: "#050714",
  });
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = dataUrl;
  anchor.click();
}
