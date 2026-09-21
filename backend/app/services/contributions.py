from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Iterator

import pandas as pd

from ..config import Settings
from ..github_client import GitHubClient
from ..models import (
    ActivityBreakdown,
    ChartRange,
    Aggregation,
    ContributionDay,
    ContributionResponse,
    QueryMeta,
    TrendPoint,
    UserProfile,
)


EMPTY_COLOR = "#161b22"


def iter_date_chunks(start_date: date, end_date: date) -> Iterator[tuple[date, date]]:
    """GitHub limits a contributionsCollection window to at most one year."""
    cursor = start_date
    while cursor <= end_date:
        chunk_end = min(cursor + timedelta(days=364), end_date)
        yield cursor, chunk_end
        cursor = chunk_end + timedelta(days=1)


def _longest_streak(counts: list[int]) -> int:
    best = current = 0
    for count in counts:
        current = current + 1 if count > 0 else 0
        best = max(best, current)
    return best


def build_daily_frame(users: list[dict[str, Any]], start_date: date, end_date: date) -> pd.DataFrame:
    by_date: dict[date, dict[str, Any]] = {}
    for user in users:
        calendar = user["contributionsCollection"]["contributionCalendar"]
        for week in calendar["weeks"]:
            for item in week["contributionDays"]:
                item_date = date.fromisoformat(item["date"])
                if start_date <= item_date <= end_date:
                    by_date[item_date] = {
                        "date": item_date,
                        "count": int(item["contributionCount"]),
                        "color": item.get("color") or EMPTY_COLOR,
                        "weekday": int(item.get("weekday", item_date.weekday() + 1)) % 7,
                    }

    rows: list[dict[str, Any]] = []
    for timestamp in pd.date_range(start_date, end_date, freq="D"):
        day = timestamp.date()
        rows.append(
            by_date.get(
                day,
                {
                    "date": day,
                    "count": 0,
                    "color": EMPTY_COLOR,
                    "weekday": (day.weekday() + 1) % 7,
                },
            )
        )
    return pd.DataFrame(rows)


def aggregate_frame(frame: pd.DataFrame, aggregation: Aggregation) -> list[TrendPoint]:
    data = frame.copy()
    data["date"] = pd.to_datetime(data["date"])

    if aggregation == "day":
        return [
            TrendPoint(
                label=row.date.strftime("%Y-%m-%d"),
                start_date=row.date.date(),
                end_date=row.date.date(),
                count=int(row.count),
            )
            for row in data.itertuples()
        ]

    period_freq = "W-SUN" if aggregation == "week" else "M"
    data["period"] = data["date"].dt.to_period(period_freq)
    grouped = data.groupby("period", sort=True)["count"].sum()
    range_start = data["date"].min().date()
    range_end = data["date"].max().date()

    points: list[TrendPoint] = []
    for period, count in grouped.items():
        point_start = max(period.start_time.date(), range_start)
        point_end = min(period.end_time.date(), range_end)
        label = (
            f"{point_start:%Y-%m-%d} ~ {point_end:%m-%d}"
            if aggregation == "week"
            else f"{point_start:%Y-%m}"
        )
        points.append(
            TrendPoint(label=label, start_date=point_start, end_date=point_end, count=int(count))
        )
    return points


def build_trend(frame: pd.DataFrame, aggregation: Aggregation, trend_weeks: int | None = None) -> list[TrendPoint]:
    """Limit only the trend to recent Monday-Sunday weeks ending at the query end."""
    if frame.empty:
        return []
    if trend_weeks is None:
        return aggregate_frame(frame, aggregation)
    if not 1 <= trend_weeks <= 52:
        raise ValueError("趋势周数必须在 1 到 52 之间")
    end_date = pd.Timestamp(frame["date"].max()).date()
    first_monday = end_date - timedelta(days=end_date.weekday() + 7 * (trend_weeks - 1))
    # Keep the original frame intact for the heatmap, metrics and activity totals.
    recent = frame.loc[pd.to_datetime(frame["date"]).dt.date >= first_monday]
    return aggregate_frame(recent, "week")


def resolve_chart_range(selection: ChartRange | None, start: date, end: date) -> tuple[date, date]:
    if selection is None:
        return start, end
    if selection.mode == "custom":
        assert selection.start_date is not None and selection.end_date is not None
        return selection.start_date, selection.end_date
    if selection.unit == "day":
        first = end - timedelta(days=selection.count - 1)
    elif selection.unit == "week":
        first = end - timedelta(days=end.weekday() + 7 * (selection.count - 1))
    else:
        month_index = end.year * 12 + end.month - selection.count
        first = date(month_index // 12, month_index % 12 + 1, 1)
    return first, end


async def get_contributions(
    settings: Settings,
    username: str,
    start_date: date,
    end_date: date,
    aggregation: Aggregation,
    token: str | None,
    trend_weeks: int | None = None,
    trend_range: ChartRange | None = None,
    heatmap_range: ChartRange | None = None,
    activity_scope: str = "all",
) -> ContributionResponse:
    trend_start, trend_end = resolve_chart_range(trend_range, start_date, end_date)
    heatmap_start, heatmap_end = resolve_chart_range(heatmap_range, start_date, end_date)
    async with GitHubClient(settings, token) as client:
        cache: dict[tuple[date, date], dict[str, Any]] = {}

        async def fetch_range(first: date, last: date) -> list[dict[str, Any]]:
            result = []
            for chunk_start, chunk_end in iter_date_chunks(first, last):
                key = (chunk_start, chunk_end)
                if key not in cache:
                    cache[key] = await client.fetch_period(username, chunk_start, chunk_end)
                result.append(cache[key])
            return result

        users = await fetch_range(heatmap_start, heatmap_end)
        trend_users = await fetch_range(trend_start, trend_end)
        first_user = users[0]
        activity_start, activity_end = start_date, end_date
        if activity_scope == "all":
            activity_start = date.fromisoformat(first_user["createdAt"][:10])
            activity_end = date.today()
        activity_users = await fetch_range(activity_start, activity_end)

    frame = build_daily_frame(users, heatmap_start, heatmap_end)
    trend_frame = build_daily_frame(trend_users, trend_start, trend_end)
    effective_weeks = trend_weeks if trend_range is None else None
    trend = build_trend(trend_frame, aggregation, effective_weeks)
    activity = ActivityBreakdown()
    restricted = sum(int(u["contributionsCollection"].get("restrictedContributionsCount", 0)) for u in users)
    activity_restricted = 0
    for user in activity_users:
        collection = user["contributionsCollection"]
        activity.commits += int(collection.get("totalCommitContributions", 0))
        activity.pull_requests += int(collection.get("totalPullRequestContributions", 0))
        activity.issues += int(collection.get("totalIssueContributions", 0))
        activity.code_reviews += int(collection.get("totalPullRequestReviewContributions", 0))
        activity.repositories += int(collection.get("totalRepositoryContributions", 0))
        activity_restricted += int(collection.get("restrictedContributionsCount", 0))

    first_user = users[0]
    counts = [int(value) for value in frame["count"].tolist()]
    daily = [
        ContributionDay(
            date=row.date,
            count=int(row.count),
            color=row.color,
            weekday=int(row.weekday),
        )
        for row in frame.itertuples()
    ]
    return ContributionResponse(
        user=UserProfile(
            login=first_user["login"],
            name=first_user.get("name"),
            avatar_url=first_user["avatarUrl"],
            profile_url=first_user["url"],
        ),
        daily=daily,
        trend=trend,
        activity=activity,
        meta=QueryMeta(
            start_date=heatmap_start,
            end_date=heatmap_end,
            aggregation="week" if effective_weeks is not None else aggregation,
            trend_weeks=effective_weeks,
            trend_start_date=trend[0].start_date,
            trend_end_date=trend[-1].end_date,
            activity_start_date=activity_start,
            activity_end_date=activity_end,
            activity_scope=activity_scope,
            activity_restricted_contributions=activity_restricted,
            total_contributions=sum(counts),
            active_days=sum(count > 0 for count in counts),
            longest_streak=_longest_streak(counts),
            restricted_contributions=restricted,
        ),
    )
