from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from html import escape
from math import pi

from ..models import ContributionResponse


def _color_for_count(count: int) -> str:
    if count >= 10:
        return "#c058ff"
    if count >= 6:
        return "#765cff"
    if count >= 3:
        return "#366ff2"
    if count >= 1:
        return "#174285"
    return "#0c1123"


def _smooth_path(points: list[tuple[float, float]]) -> str:
    if not points:
        return ""
    if len(points) == 1:
        return f"M{points[0][0]:.1f} {points[0][1]:.1f}"
    tension = 0.18
    commands = [f"M{points[0][0]:.1f} {points[0][1]:.1f}"]
    for index in range(len(points) - 1):
        previous = points[max(0, index - 1)]
        current = points[index]
        next_point = points[index + 1]
        following = points[min(len(points) - 1, index + 2)]
        cp1 = (
            current[0] + (next_point[0] - previous[0]) * tension,
            current[1] + (next_point[1] - previous[1]) * tension,
        )
        cp2 = (
            next_point[0] - (following[0] - current[0]) * tension,
            next_point[1] - (following[1] - current[1]) * tension,
        )
        commands.append(
            f"C{cp1[0]:.1f} {cp1[1]:.1f} {cp2[0]:.1f} {cp2[1]:.1f} {next_point[0]:.1f} {next_point[1]:.1f}"
        )
    return "".join(commands)


def _signal_dot(cx: float, cy: float) -> str:
    return f"""
    <g aria-hidden="true">
      <circle cx="{cx}" cy="{cy}" r="7" fill="#28d7ff" opacity="0.08">
        <animate attributeName="r" values="6;10;6" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.04;0.22;0.04" dur="3.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="{cx}" cy="{cy}" r="3" fill="#28d7ff" opacity="0.45">
        <animate attributeName="r" values="2.4;3.7;2.4" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.42;1;0.42" dur="3.6s" repeatCount="indefinite" />
      </circle>
    </g>"""


def _activity_ring(data: ContributionResponse, center_x: float, center_y: float) -> str:
    entries = [
        ("Commits", data.activity.commits, "#28d7ff"),
        ("Pull requests", data.activity.pull_requests, "#5a7cff"),
        ("Issues", data.activity.issues, "#8b5cf6"),
        ("Code reviews", data.activity.code_reviews, "#d053ff"),
    ]
    total = max(1, sum(value for _, value, _ in entries))
    radius = 78
    circumference = 2 * pi * radius
    offset = 0.0
    rings: list[str] = []
    legend: list[str] = []
    for index, (name, value, color) in enumerate(entries):
        length = circumference * value / total
        visible = max(0.0, length - 5)
        if value > 0:
            rings.append(
                f"""<circle cx="{center_x}" cy="{center_y}" r="{radius}" fill="none" stroke="{color}" stroke-width="31"
                  stroke-linecap="round" stroke-dasharray="{visible:.2f} {circumference - visible:.2f}" stroke-dashoffset="{-offset:.2f}"
                  transform="rotate(-90 {center_x} {center_y})">
                  <animate attributeName="stroke-dashoffset" values="{circumference - offset:.2f};{-offset:.2f}" dur="1.65s" fill="freeze" />
                </circle>"""
            )
        legend_y = center_y - 62 + index * 42
        legend.append(
            f'<circle cx="{center_x + 132}" cy="{legend_y}" r="4" fill="{color}" />'
            f'<text x="{center_x + 144}" y="{legend_y + 4}" class="legend">{escape(name)}  {value}</text>'
        )
        offset += length
    return (
        f'<circle cx="{center_x}" cy="{center_y}" r="{radius}" fill="none" stroke="#151c31" stroke-width="31" />'
        + "".join(rings)
        + f'<text x="{center_x}" y="{center_y - 2}" text-anchor="middle" class="metric">{sum(value for _, value, _ in entries)}</text>'
        + f'<text x="{center_x}" y="{center_y + 19}" text-anchor="middle" class="micro">ACTIVITIES</text>'
        + "".join(legend)
    )


def render_contribution_svg(data: ContributionResponse) -> str:
    width = 1400
    years = sorted({item.date.year for item in data.daily})
    heatmap_height = max(245, len(years) * 152 + 76)
    height = 548 + heatmap_height + 28
    trend_x, trend_y, trend_width, trend_height = 78, 242, 806, 190
    counts = [point.count for point in data.trend]
    maximum = max(1, *counts)
    step = trend_width / max(1, len(counts) - 1)
    points = [
        (trend_x + index * step, trend_y + trend_height - count / maximum * trend_height)
        for index, count in enumerate(counts)
    ]
    trend_path = _smooth_path(points)
    area_path = (
        f"{trend_path}L{points[-1][0]:.1f} {trend_y + trend_height}L{points[0][0]:.1f} {trend_y + trend_height}Z"
        if len(points) > 1
        else ""
    )
    label_step = max(1, (len(data.trend) + 7) // 8)
    trend_labels = "".join(
        f'<text x="{points[index][0]:.1f}" y="{trend_y + trend_height + 27}" text-anchor="middle" class="axis">{escape(point.label)}</text>'
        for index, point in enumerate(data.trend)
        if index % label_step == 0 or index == len(data.trend) - 1
    )

    heatmap_top = 596
    heatmap_parts: list[str] = []
    by_year: dict[int, list] = defaultdict(list)
    for item in data.daily:
        by_year[item.date.year].append(item)
    for year_index, year in enumerate(years):
        section_top = heatmap_top + year_index * 152
        year_start = date(year, 1, 1)
        first_sunday = year_start - timedelta(days=(year_start.weekday() + 1) % 7)
        heatmap_parts.append(f'<text x="65" y="{section_top + 78}" class="year">{year}</text>')
        for month in range(1, 13):
            month_date = date(year, month, 1)
            if month_date < data.meta.start_date or month_date > data.meta.end_date:
                continue
            week = (month_date - first_sunday).days // 7
            heatmap_parts.append(f'<text x="{122 + week * 20}" y="{section_top + 31}" class="axis">{month}月</text>')
        for item in by_year[year]:
            week = (item.date - first_sunday).days // 7
            x = 122 + week * 20
            y = section_top + 43 + item.weekday * 15
            stroke = "#8df2ff" if item.date == data.meta.end_date else "#060817"
            heatmap_parts.append(
                f'<rect x="{x}" y="{y}" width="12" height="12" rx="2.4" fill="{_color_for_count(item.count)}" stroke="{stroke}">'
                f'<title>{item.date.isoformat()} · {item.count} contributions</title></rect>'
            )

    date_count = (data.meta.end_date - data.meta.start_date).days + 1
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <title>GitPulse animated contribution report</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#070a18"/><stop offset="1" stop-color="#040611"/></linearGradient>
    <linearGradient id="trend" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#25d9ff"/><stop offset=".55" stop-color="#58c8ff"/><stop offset="1" stop-color="#9b7cff"/></linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#28d7ff" stop-opacity=".28"/><stop offset="1" stop-color="#4c67ff" stop-opacity="0"/></linearGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#4666a5" stroke-opacity=".045"/></pattern>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="trend-reveal"><rect x="{trend_x}" y="{trend_y - 18}" width="0" height="{trend_height + 42}"><animate attributeName="width" values="0;{trend_width}" dur="1.45s" fill="freeze"/></rect></clipPath>
  </defs>
  <style>
    text{{font-family:Inter,"Segoe UI","Microsoft YaHei",sans-serif}} .tech{{font-size:10px;font-weight:700;letter-spacing:1.8px;fill:#28d7ff}}
    .title{{font-size:25px;font-weight:700;fill:#f1f5ff}} .sub{{font-size:11px;fill:#66728d}} .axis{{font-size:9px;fill:#66738e}}
    .year{{font-size:12px;font-weight:700;fill:#7f8da8}} .metric{{font-size:24px;font-weight:700;fill:#edf4ff}}
    .micro{{font-size:8px;letter-spacing:1px;fill:#66728d}} .legend{{font-size:10px;fill:#8a96af}}
  </style>
  <rect width="100%" height="100%" fill="url(#bg)"/><rect width="100%" height="100%" fill="url(#grid)"/>
  <text x="42" y="47" class="tech">GITPULSE / AUTOMATED VECTOR REPORT</text>
  <text x="42" y="80" class="title">@{escape(data.user.login)} · GitHub Contribution Intelligence</text>
  <text x="42" y="105" class="sub">{data.meta.start_date} — {data.meta.end_date} · {data.meta.aggregation.upper()} aggregation · generated by GitPulse</text>
  {_signal_dot(1350, 50)}

  <g transform="translate(42 128)">
    <rect width="215" height="78" rx="15" fill="#0a0e20" stroke="#1a233c"/><text x="18" y="26" class="micro">TOTAL CONTRIBUTIONS</text><text x="18" y="59" class="metric">{data.meta.total_contributions}</text>
    <rect x="231" width="215" height="78" rx="15" fill="#0a0e20" stroke="#1a233c"/><text x="249" y="26" class="micro">ACTIVE DAYS</text><text x="249" y="59" class="metric">{data.meta.active_days}</text>
    <rect x="462" width="215" height="78" rx="15" fill="#0a0e20" stroke="#1a233c"/><text x="480" y="26" class="micro">LONGEST STREAK</text><text x="480" y="59" class="metric">{data.meta.longest_streak}D</text>
    <rect x="693" width="215" height="78" rx="15" fill="#0a0e20" stroke="#1a233c"/><text x="711" y="26" class="micro">OBSERVED</text><text x="711" y="59" class="metric">{date_count}D</text>
  </g>

  <rect x="42" y="224" width="884" height="306" rx="18" fill="#0a0e20" stroke="#1a233c"/>
  <text x="62" y="253" class="tech">SIGNAL / CONTRIBUTION TREND</text>
  <path d="M{trend_x} {trend_y + trend_height}H{trend_x + trend_width}M{trend_x} {trend_y + trend_height / 2}H{trend_x + trend_width}M{trend_x} {trend_y}H{trend_x + trend_width}" stroke="#7182a8" stroke-opacity=".12" stroke-dasharray="4 8"/>
  <g clip-path="url(#trend-reveal)">
    {f'<path d="{area_path}" fill="url(#area)"/>' if area_path else ''}
    <path d="{trend_path}" fill="none" stroke="url(#trend)" stroke-width="3" filter="url(#glow)"/>
    <path d="{trend_path}" fill="none" stroke="#d5fbff" stroke-width="1.6" stroke-dasharray="5 11 24 17" stroke-linecap="round"><animate attributeName="stroke-dashoffset" values="0;-57" dur="2.9s" repeatCount="indefinite"/></path>
  </g>
  {trend_labels}

  <rect x="944" y="224" width="414" height="306" rx="18" fill="#0a0e20" stroke="#1a233c"/>
  <text x="964" y="253" class="tech" fill="#9b7cff">SIGNAL / ACTIVITY DISTRIBUTION</text>
  {_activity_ring(data, 1068, 380)}

  <rect x="42" y="548" width="1316" height="{heatmap_height}" rx="18" fill="#0a0e20" stroke="#1a233c"/>
  <text x="62" y="579" class="tech">SIGNAL / DAILY HEATMAP</text>
  {''.join(heatmap_parts)}
</svg>"""
