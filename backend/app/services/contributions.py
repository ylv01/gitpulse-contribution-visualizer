from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Iterator

import pandas as pd

from ..config import Settings
from ..github_client import GitHubClient
from ..models import (
    ActivityBreakdown,
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


async def get_contributions(
    settings: Settings,
    username: str,
    start_date: date,
    end_date: date,
    aggregation: Aggregation,
    token: str | None,
) -> ContributionResponse:
    users: list[dict[str, Any]] = []
    async with GitHubClient(settings, token) as client:
        for chunk_start, chunk_end in iter_date_chunks(start_date, end_date):
            users.append(await client.fetch_period(username, chunk_start, chunk_end))

    frame = build_daily_frame(users, start_date, end_date)
    activity = ActivityBreakdown()
    restricted = 0
    for user in users:
        collection = user["contributionsCollection"]
        activity.commits += int(collection.get("totalCommitContributions", 0))
        activity.pull_requests += int(collection.get("totalPullRequestContributions", 0))
        activity.issues += int(collection.get("totalIssueContributions", 0))
        activity.code_reviews += int(collection.get("totalPullRequestReviewContributions", 0))
        restricted += int(collection.get("restrictedContributionsCount", 0))

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
        trend=aggregate_frame(frame, aggregation),
        activity=activity,
        meta=QueryMeta(
            start_date=start_date,
            end_date=end_date,
            aggregation=aggregation,
            total_contributions=sum(counts),
            active_days=sum(count > 0 for count in counts),
            longest_streak=_longest_streak(counts),
            restricted_contributions=restricted,
        ),
    )

