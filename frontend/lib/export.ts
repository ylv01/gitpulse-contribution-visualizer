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

const SVG_NS = "http://www.w3.org/2000/svg";

interface SvgSource {
  element: SVGSVGElement;
  width: number;
  height: number;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findChart(root: HTMLElement, selector: string, required = true): SvgSource | null {
  const element = root.querySelector<SVGSVGElement>(`${selector} svg`);
  if (!element) {
    if (required) throw new Error("图表尚未完成 SVG 渲染，请稍后再导出");
    return null;
  }

  const viewBox = element.viewBox.baseVal;
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.round(viewBox.width || rect.width || Number(element.getAttribute("width"))));
  const height = Math.max(1, Math.round(viewBox.height || rect.height || Number(element.getAttribute("height"))));
  return { element, width, height };
}

function namespaceSvg(svg: SVGSVGElement, prefix: string): void {
  const elements = [svg, ...Array.from(svg.querySelectorAll<SVGElement>("*"))];
  const idMap = new Map<string, string>();
  const classMap = new Map<string, string>();

  elements.forEach((element) => {
    const id = element.getAttribute("id");
    if (id) idMap.set(id, `${prefix}-${id}`);
    (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).forEach((name) => {
      classMap.set(name, `${prefix}-${name}`);
    });
  });

  elements.forEach((element) => {
    const id = element.getAttribute("id");
    if (id) element.setAttribute("id", idMap.get(id) ?? id);

    const classes = (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
    if (classes.length) element.setAttribute("class", classes.map((name) => classMap.get(name) ?? name).join(" "));

    Array.from(element.attributes).forEach((attribute) => {
      let value = attribute.value;
      idMap.forEach((nextId, previousId) => {
        value = value.replaceAll(`url(#${previousId})`, `url(#${nextId})`);
        if (value === `#${previousId}`) value = `#${nextId}`;
      });
      element.setAttribute(attribute.name, value);
    });
  });

  svg.querySelectorAll("style").forEach((style) => {
    let css = style.textContent ?? "";
    idMap.forEach((nextId, previousId) => {
      css = css.replaceAll(`url(#${previousId})`, `url(#${nextId})`);
      css = css.replace(new RegExp(`#${escapeRegExp(previousId)}(?![\\w-])`, "g"), `#${nextId}`);
    });
    classMap.forEach((nextClass, previousClass) => {
      css = css.replace(new RegExp(`\\.${escapeRegExp(previousClass)}(?![\\w-])`, "g"), `.${nextClass}`);
    });
    style.textContent = css;
  });
}

function serializeChart(
  source: SvgSource,
  prefix: string,
  x: number,
  y: number,
  animateTrend = false,
): string {
  const svg = source.element.cloneNode(true) as SVGSVGElement;
  namespaceSvg(svg, prefix);
  svg.setAttribute("x", String(x));
  svg.setAttribute("y", String(y));
  svg.setAttribute("width", String(source.width));
  svg.setAttribute("height", String(source.height));
  svg.setAttribute("viewBox", `0 0 ${source.width} ${source.height}`);
  svg.setAttribute("overflow", "visible");

  if (animateTrend) {
    const flowPath = svg.querySelector<SVGPathElement>('path[stroke="#d5fbff"]');
    if (!flowPath) throw new Error("未找到趋势流光路径，请刷新页面后重试");
    flowPath.setAttribute("stroke-dasharray", "5 11 24 17");
    flowPath.setAttribute("stroke-dashoffset", "0");
    const animation = document.createElementNS(SVG_NS, "animate");
    animation.setAttribute("attributeName", "stroke-dashoffset");
    animation.setAttribute("values", "0;-57");
    animation.setAttribute("dur", "2.9s");
    animation.setAttribute("repeatCount", "indefinite");
    flowPath.appendChild(animation);
  }

  return new XMLSerializer().serializeToString(svg);
}

function animatedSignalDot(cx: number, cy: number, color = "#28d7ff"): string {
  return `
    <g aria-hidden="true">
      <circle cx="${cx}" cy="${cy}" r="7" fill="${color}" opacity="0.08">
        <animate attributeName="r" values="6;10;6" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.04;0.22;0.04" dur="3.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="${cx}" cy="${cy}" r="3" fill="${color}" opacity="0.45">
        <animate attributeName="r" values="2.4;3.7;2.4" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.42;1;0.42" dur="3.6s" repeatCount="indefinite" />
      </circle>
    </g>`;
}

function chartCard(
  x: number,
  y: number,
  width: number,
  height: number,
  eyebrow: string,
  title: string,
  description: string,
  chart: string,
  accent: "cyan" | "violet" = "cyan",
): string {
  const accentColor = accent === "cyan" ? "#28d7ff" : "#9b7cff";
  const status = accent === "cyan"
    ? animatedSignalDot(x + width - 28, y + 27)
    : `<circle cx="${x + width - 28}" cy="${y + 27}" r="4" fill="#9b7cff" opacity="0.9" />`;

  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="#0a0e20" stroke="#1a233c" />
      <path d="M${x + 24} ${y + 1}H${x + width - 24}" stroke="url(#card-line)" />
      <text x="${x + 20}" y="${y + 25}" fill="${accentColor}" font-size="10" font-weight="700" letter-spacing="1.6">${escapeXml(eyebrow.toUpperCase())}</text>
      <text x="${x + 20}" y="${y + 48}" fill="#f1f5ff" font-size="18" font-weight="650">${escapeXml(title)}</text>
      <text x="${x + 20}" y="${y + 67}" fill="#66728d" font-size="11">${escapeXml(description)}</text>
      ${status}
      ${chart}
    </g>`;
}

export async function exportReportSvg(elementId: string, filename: string): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) throw new Error("找不到可导出的图表区域");

  const trend = findChart(node, ".export-trend-chart");
  const activity = findChart(node, ".export-activity-chart", false);
  const heatmap = findChart(node, ".export-heatmap-chart");
  if (!trend || !heatmap) throw new Error("图表尚未完成 SVG 渲染，请稍后再导出");

  const margin = 24;
  const gap = 16;
  const cardPadding = 20;
  const chartTop = 78;
  const activityWidth = activity?.width ?? 420;
  const activityHeight = activity?.height ?? trend.height;
  const trendCardWidth = trend.width + cardPadding * 2;
  const activityCardWidth = activityWidth + cardPadding * 2;
  const canvasWidth = Math.max(
    trendCardWidth + activityCardWidth + gap + margin * 2,
    heatmap.width + cardPadding * 2 + margin * 2,
  );
  const topCardHeight = chartTop + Math.max(trend.height, activityHeight) + 12;
  const heatmapCardHeight = chartTop + heatmap.height + 12;
  const heatmapY = margin + topCardHeight + gap;
  const canvasHeight = heatmapY + heatmapCardHeight + margin;
  const activityX = margin + trendCardWidth + gap;
  const heatmapCardWidth = canvasWidth - margin * 2;
  const heatmapChartX = margin + (heatmapCardWidth - heatmap.width) / 2;

  const trendSvg = serializeChart(trend, "trend", margin + cardPadding, margin + chartTop, true);
  const activitySvg = activity
    ? serializeChart(activity, "activity", activityX + cardPadding, margin + chartTop)
    : `<text x="${activityX + activityCardWidth / 2}" y="${margin + chartTop + activityHeight / 2}" text-anchor="middle" fill="#59657e" font-size="14">该时间段暂无分类活动</text>`;
  const heatmapSvg = serializeChart(heatmap, "heatmap", heatmapChartX, heatmapY + chartTop);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="${SVG_NS}" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <title>GitPulse animated contribution report</title>
  <defs>
    <linearGradient id="canvas-bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#070a18" />
      <stop offset="1" stop-color="#040611" />
    </linearGradient>
    <linearGradient id="card-line" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="#28d7ff" stop-opacity="0" />
      <stop offset="0.5" stop-color="#28d7ff" stop-opacity="0.5" />
      <stop offset="1" stop-color="#8b5cf6" stop-opacity="0" />
    </linearGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M56 0H0V56" fill="none" stroke="#4666a5" stroke-opacity="0.045" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#canvas-bg)" />
  <rect width="100%" height="100%" fill="url(#grid)" />
  ${chartCard(margin, margin, trendCardWidth, topCardHeight, "Signal / 01", "贡献趋势", "选定时间窗内的贡献强度变化 · 霓虹光泽沿时间方向持续流动", trendSvg)}
  ${chartCard(activityX, margin, activityCardWidth, topCardHeight, "Signal / 02", "活动类型分布", "公开活动的构成与协作偏好", activitySvg, "violet")}
  ${chartCard(margin, heatmapY, heatmapCardWidth, heatmapCardHeight, "Signal / 03", "贡献热力图", "GitHub 风格日历矩阵，颜色越亮表示贡献越集中", heatmapSvg)}
</svg>`;

  download(svg, "image/svg+xml;charset=utf-8", filename);
}
