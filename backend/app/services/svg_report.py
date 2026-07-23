from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from html import escape
from math import ceil, floor, log10, pi

from ..models import ContributionResponse


CANVAS_WIDTH = 1440
MARGIN = 24
GAP = 16
TOP_Y = MARGIN
TOP_HEIGHT = 390
TREND_CARD_WIDTH = 924
ACTIVITY_X = MARGIN + TREND_CARD_WIDTH + GAP
ACTIVITY_CARD_WIDTH = CANVAS_WIDTH - MARGIN - ACTIVITY_X
HEATMAP_Y = TOP_Y + TOP_HEIGHT + GAP
HEATMAP_CARD_WIDTH = CANVAS_WIDTH - MARGIN * 2


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


def _nice_axis(maximum: int) -> tuple[int, int]:
    if maximum <= 0:
        return 4, 1
    raw_step = maximum / 4
    magnitude = 10 ** floor(log10(raw_step))
    fraction = raw_step / magnitude
    if fraction <= 1:
        nice_fraction = 1
    elif fraction <= 2:
        nice_fraction = 2
    elif fraction <= 5:
        nice_fraction = 5
    else:
        nice_fraction = 10
    step = max(1, int(nice_fraction * magnitude))
    return step * 4, step


def _signal_dot(cx: float, cy: float, color: str = "#28d7ff") -> str:
    return f"""
    <g aria-hidden="true">
      <circle cx="{cx}" cy="{cy}" r="7" fill="{color}" opacity="0.08">
        <animate attributeName="r" values="6;10;6" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.04;0.22;0.04" dur="3.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="{cx}" cy="{cy}" r="3" fill="{color}" opacity="0.45">
        <animate attributeName="r" values="2.4;3.7;2.4" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.42;1;0.42" dur="3.6s" repeatCount="indefinite" />
      </circle>
    </g>"""


def _card(
    x: int,
    y: int,
    width: int,
    height: int,
    eyebrow: str,
    title: str,
    description: str,
    content: str,
    accent: str = "#28d7ff",
    animated_status: bool = True,
) -> str:
    status = _signal_dot(x + width - 28, y + 27, accent) if animated_status else (
        f'<circle cx="{x + width - 28}" cy="{y + 27}" r="4" fill="{accent}" opacity="0.9" />'
    )
    return f"""
    <g>
      <rect x="{x}" y="{y}" width="{width}" height="{height}" rx="18" fill="#0a0e20" stroke="#1a233c" />
      <path d="M{x + 24} {y + 1}H{x + width - 24}" stroke="url(#card-line)" />
      <text x="{x + 20}" y="{y + 25}" fill="{accent}" class="eyebrow">{escape(eyebrow.upper())}</text>
      <text x="{x + 20}" y="{y + 48}" class="card-title">{escape(title)}</text>
      <text x="{x + 20}" y="{y + 67}" class="description">{escape(description)}</text>
      {status}
      {content}
    </g>"""


def _trend_chart(data: ContributionResponse) -> str:
    chart_left = MARGIN + 62
    chart_right = MARGIN + TREND_CARD_WIDTH - 42
    chart_top = TOP_Y + 102
    chart_bottom = TOP_Y + TOP_HEIGHT - 62
    chart_width = chart_right - chart_left
    chart_height = chart_bottom - chart_top
    counts = [point.count for point in data.trend]
    axis_max, axis_step = _nice_axis(max(counts, default=0))

    if len(counts) <= 1:
        points = [(chart_left + chart_width / 2, chart_bottom - (counts[0] if counts else 0) / axis_max * chart_height)]
    else:
        point_step = chart_width / (len(counts) - 1)
        points = [
            (chart_left + index * point_step, chart_bottom - count / axis_max * chart_height)
            for index, count in enumerate(counts)
        ]
    trend_path = _smooth_path(points)
    area_path = (
        f"{trend_path}L{points[-1][0]:.1f} {chart_bottom}L{points[0][0]:.1f} {chart_bottom}Z"
        if len(points) > 1
        else ""
    )

    grid_parts: list[str] = []
    for index in range(5):
        value = index * axis_step
        y = chart_bottom - index / 4 * chart_height
        grid_parts.append(
            f'<path d="M{chart_left} {y:.1f}H{chart_right}" stroke="#7182a8" stroke-opacity=".12" stroke-dasharray="4 8" />'
            f'<text x="{chart_left - 12}" y="{y + 4:.1f}" text-anchor="end" class="axis">{value}</text>'
        )

    label_step = max(1, ceil(len(data.trend) / 7))
    labels = "".join(
        f'<text x="{points[index][0]:.1f}" y="{chart_bottom + 28}" text-anchor="middle" class="axis">{escape(point.label)}</text>'
        for index, point in enumerate(data.trend)
        if index % label_step == 0 or index == len(data.trend) - 1
    )
    dots = "".join(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="#77e7ff" stroke="#07101e" stroke-width="2" />'
        for x, y in points
    ) if len(points) < 45 else ""
    paths = ""
    if trend_path:
        paths = f"""
        <g clip-path="url(#trend-reveal)">
          {f'<path d="{area_path}" fill="url(#trend-area)" />' if area_path else ''}
          <path d="{trend_path}" fill="none" stroke="url(#trend-line)" stroke-width="2.5" filter="url(#trend-glow)" />
          <path d="{trend_path}" fill="none" stroke="#d5fbff" stroke-width="2.1" stroke-dasharray="5 11 24 17" stroke-linecap="round" opacity=".84">
            <animate attributeName="stroke-dashoffset" values="0;-57" dur="2.9s" repeatCount="indefinite" />
          </path>
          {dots}
        </g>"""
    return "".join(grid_parts) + paths + labels


def _activity_chart(data: ContributionResponse) -> str:
    entries = [
        ("Commits", data.activity.commits, "#28d7ff"),
        ("Pull requests", data.activity.pull_requests, "#5a7cff"),
        ("Issues", data.activity.issues, "#8b5cf6"),
        ("Code reviews", data.activity.code_reviews, "#d053ff"),
    ]
    total = sum(value for _, value, _ in entries)
    center_x = ACTIVITY_X + 163
    center_y = TOP_Y + 230
    radius = 94
    stroke_width = 31
    circumference = 2 * pi * radius
    offset = 0.0
    sectors: list[str] = []
    legend: list[str] = []
    for index, (name, value, color) in enumerate(entries):
        length = circumference * value / max(1, total)
        visible = max(0.0, length - 5)
        if value > 0:
            sectors.append(
                f'<circle cx="{center_x}" cy="{center_y}" r="{radius}" fill="none" stroke="{color}" stroke-width="{stroke_width}" '
                f'stroke-linecap="round" stroke-dasharray="{visible:.2f} {circumference - visible:.2f}" stroke-dashoffset="{-offset:.2f}" '
                f'transform="rotate(-90 {center_x} {center_y})" />'
            )
        legend_y = center_y - 56 + index * 36
        legend.append(
            f'<circle cx="{center_x + 171}" cy="{legend_y}" r="4" fill="{color}" />'
            f'<text x="{center_x + 184}" y="{legend_y + 4}" class="legend">{escape(name)}  {value}</text>'
        )
        offset += length

    if total == 0:
        return f'<text x="{ACTIVITY_X + ACTIVITY_CARD_WIDTH / 2}" y="{center_y}" text-anchor="middle" class="description">该时间段暂无分类活动</text>'
    return (
        f'<circle cx="{center_x}" cy="{center_y}" r="{radius}" fill="none" stroke="#151c31" stroke-width="{stroke_width}" />'
        f'<g mask="url(#activity-reveal)">{"".join(sectors)}</g>'
        f'<text x="{center_x}" y="{center_y - 3}" text-anchor="middle" class="activity-total">{total}</text>'
        f'<text x="{center_x}" y="{center_y + 19}" text-anchor="middle" class="micro">ACTIVITIES</text>'
        + "".join(legend)
    )


def _heatmap_chart(data: ContributionResponse) -> tuple[str, int]:
    years = sorted({item.date.year for item in data.daily})
    calendar_height = 148
    chart_height = max(218, len(years) * calendar_height + 70)
    card_height = chart_height + 90
    chart_origin_y = HEATMAP_Y + 78
    chart_left = MARGIN + 76
    chart_right = MARGIN + HEATMAP_CARD_WIDTH - 42
    available_width = chart_right - chart_left
    parts: list[str] = []
    by_year: dict[int, list] = defaultdict(list)
    for item in data.daily:
        by_year[item.date.year].append(item)

    legend_x = chart_right - 112
    parts.append(f'<text x="{legend_x - 34}" y="{chart_origin_y + 10}" class="micro">LOW</text>')
    for index, color in enumerate(["#174285", "#366ff2", "#5a7cff", "#765cff", "#c058ff"]):
        parts.append(f'<rect x="{legend_x + index * 14}" y="{chart_origin_y + 1}" width="10" height="10" rx="2" fill="{color}" />')
    parts.append(f'<text x="{legend_x + 74}" y="{chart_origin_y + 10}" class="micro">HIGH</text>')

    day_names = ["日", "一", "二", "三", "四", "五", "六"]
    for year_index, year in enumerate(years):
        items = sorted(by_year[year], key=lambda item: item.date)
        if not items:
            continue
        section_top = chart_origin_y + 30 + year_index * calendar_height
        range_start = items[0].date
        range_end = items[-1].date
        first_sunday = range_start - timedelta(days=(range_start.weekday() + 1) % 7)
        last_saturday = range_end + timedelta(days=(5 - range_end.weekday()) % 7)
        week_count = max(1, (last_saturday - first_sunday).days // 7 + 1)
        cell_width = available_width / week_count
        rect_width = max(3.0, cell_width - 3)

        year_x = MARGIN + 38
        year_y = section_top + 49
        parts.append(
            f'<text x="{year_x}" y="{year_y}" text-anchor="middle" class="year" transform="rotate(-90 {year_x} {year_y})">{year}</text>'
        )
        for row, name in enumerate(day_names):
            parts.append(
                f'<text x="{chart_left - 12}" y="{section_top + 18 + row * 14}" text-anchor="end" class="day">{name}</text>'
            )

        months = sorted({item.date.month for item in items})
        for month in months:
            month_start = max(range_start, date(year, month, 1))
            week = (month_start - first_sunday).days // 7
            month_x = chart_left + week * cell_width
            parts.append(f'<text x="{month_x:.1f}" y="{section_top - 5}" class="axis">{month}月</text>')

        for item in items:
            week = (item.date - first_sunday).days // 7
            x = chart_left + week * cell_width + 1.5
            y = section_top + 6 + item.weekday * 14
            stroke = "#8df2ff" if item.date == data.meta.end_date else "#060817"
            parts.append(
                f'<rect x="{x:.2f}" y="{y:.1f}" width="{rect_width:.2f}" height="12" rx="2.4" fill="{_color_for_count(item.count)}" stroke="{stroke}" stroke-width="1">'
                f'<title>{item.date.isoformat()} · {item.count} contributions</title></rect>'
            )
    return "".join(parts), card_height


def render_contribution_svg(data: ContributionResponse) -> str:
    heatmap, heatmap_card_height = _heatmap_chart(data)
    canvas_height = HEATMAP_Y + heatmap_card_height + MARGIN
    activity_center_x = ACTIVITY_X + 163
    activity_center_y = TOP_Y + 230
    activity_radius = 94
    activity_circumference = 2 * pi * activity_radius
    trend_left = MARGIN + 62
    trend_top = TOP_Y + 102
    trend_width = TREND_CARD_WIDTH - 104
    trend_height = TOP_HEIGHT - 164

    trend_card = _card(
        MARGIN,
        TOP_Y,
        TREND_CARD_WIDTH,
        TOP_HEIGHT,
        "Signal / 01",
        "贡献趋势",
        "选定时间窗内的贡献强度变化 · 霓虹光泽沿时间方向持续流动",
        _trend_chart(data),
    )
    activity_card = _card(
        ACTIVITY_X,
        TOP_Y,
        ACTIVITY_CARD_WIDTH,
        TOP_HEIGHT,
        "Signal / 02",
        "活动类型分布",
        "公开活动的构成与协作偏好 · 圆环顺时针加载",
        _activity_chart(data),
        accent="#9b7cff",
        animated_status=False,
    )
    heatmap_card = _card(
        MARGIN,
        HEATMAP_Y,
        HEATMAP_CARD_WIDTH,
        heatmap_card_height,
        "Signal / 03",
        "贡献热力图",
        "GitHub 风格日历矩阵，颜色越亮表示贡献越集中",
        heatmap,
    )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS_WIDTH}" height="{canvas_height}" viewBox="0 0 {CANVAS_WIDTH} {canvas_height}">
  <title>GitPulse animated contribution report for @{escape(data.user.login)}</title>
  <defs>
    <linearGradient id="canvas-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#070a18"/><stop offset="1" stop-color="#040611"/></linearGradient>
    <linearGradient id="card-line" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#28d7ff" stop-opacity="0"/><stop offset=".5" stop-color="#28d7ff" stop-opacity=".5"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient>
    <linearGradient id="trend-line" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#25d9ff"/><stop offset=".55" stop-color="#58c8ff"/><stop offset="1" stop-color="#9b7cff"/></linearGradient>
    <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#28d7ff" stop-opacity=".28"/><stop offset=".55" stop-color="#4c67ff" stop-opacity=".1"/><stop offset="1" stop-color="#4c67ff" stop-opacity="0"/></linearGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#4666a5" stroke-opacity=".045"/></pattern>
    <filter id="trend-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="trend-reveal"><rect x="{trend_left}" y="{trend_top - 12}" width="0" height="{trend_height + 34}"><animate attributeName="width" values="0;{trend_width}" dur="1.45s" fill="freeze"/></rect></clipPath>
    <mask id="activity-reveal" maskUnits="userSpaceOnUse" x="{ACTIVITY_X}" y="{TOP_Y}" width="{ACTIVITY_CARD_WIDTH}" height="{TOP_HEIGHT}">
      <circle cx="{activity_center_x}" cy="{activity_center_y}" r="{activity_radius}" fill="none" stroke="white" stroke-width="36" stroke-dasharray="{activity_circumference:.2f}" stroke-dashoffset="{activity_circumference:.2f}" transform="rotate(-90 {activity_center_x} {activity_center_y})">
        <animate attributeName="stroke-dashoffset" values="{activity_circumference:.2f};0" dur="1.65s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" />
      </circle>
    </mask>
  </defs>
  <style>
    text{{font-family:Inter,"Segoe UI","Microsoft YaHei",sans-serif}}
    .eyebrow{{font-size:10px;font-weight:700;letter-spacing:1.6px}}
    .card-title{{font-size:18px;font-weight:650;fill:#f1f5ff}}
    .description{{font-size:11px;fill:#66728d}}
    .axis{{font-size:10px;fill:#64708a}}
    .day{{font-size:9px;fill:#58647d}}
    .year{{font-size:11px;fill:#6f7c98}}
    .legend{{font-size:10px;fill:#8a96af}}
    .activity-total{{font-size:24px;font-weight:700;fill:#edf4ff}}
    .micro{{font-size:8px;letter-spacing:.8px;fill:#59657e}}
  </style>
  <rect width="100%" height="100%" fill="url(#canvas-bg)" />
  <rect width="100%" height="100%" fill="url(#grid)" />
  {trend_card}
  {activity_card}
  {heatmap_card}
</svg>"""
