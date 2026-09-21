import asyncio
from datetime import date, timedelta

import pandas as pd
import pytest

from app.config import Settings
from app.github_client import CONTRIBUTIONS_QUERY
from app.models import ActivityBreakdown
from app.services import contributions
from app.services.contributions import _longest_streak, aggregate_frame, build_trend, iter_date_chunks


def test_date_chunks_are_contiguous_and_bounded() -> None:
    chunks = list(iter_date_chunks(date(2023, 1, 1), date(2025, 1, 5)))
    assert chunks[0] == (date(2023, 1, 1), date(2023, 12, 31))
    assert chunks[-1][1] == date(2025, 1, 5)
    assert all((end - start).days <= 364 for start, end in chunks)
    assert all(chunks[index][1] + timedelta(days=1) == chunks[index + 1][0] for index in range(len(chunks) - 1))


def test_weekly_aggregation_and_clipped_boundaries() -> None:
    frame = pd.DataFrame(
        {
            "date": list(pd.date_range("2025-01-01", "2025-01-10").date),
            "count": [1] * 10,
            "color": ["#000"] * 10,
            "weekday": [0] * 10,
        }
    )
    points = aggregate_frame(frame, "week")
    assert [point.count for point in points] == [5, 5]
    assert points[0].start_date == date(2025, 1, 1)
    assert points[-1].end_date == date(2025, 1, 10)


def test_longest_streak() -> None:
    assert _longest_streak([0, 1, 2, 0, 4, 3, 1, 0]) == 3


@pytest.mark.parametrize("repository_counts", [(2, 3), (0, 0), (None, None)])
@pytest.mark.parametrize("trend_weeks", [None, 5])
def test_repository_contributions_across_chunks(monkeypatch, repository_counts, trend_weeks) -> None:
    assert "totalRepositoryContributions" in CONTRIBUTIONS_QUERY
    assert ActivityBreakdown().repositories == 0
    calls = []

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def fetch_period(self, username, start_date, end_date):
            repositories = repository_counts[len(calls)]
            calls.append((start_date, end_date))
            collection = {
                "totalCommitContributions": 1,
                "contributionCalendar": {"weeks": [{"contributionDays": [{
                    "date": start_date.isoformat(),
                    "contributionCount": 1 + (repositories or 0),
                }]}]},
            }
            if repositories is not None:
                collection["totalRepositoryContributions"] = repositories
            return {
                "login": username, "avatarUrl": "https://example.com/avatar.png",
                "url": "https://github.com/octocat", "contributionsCollection": collection,
            }

    monkeypatch.setattr(contributions, "GitHubClient", FakeClient)
    response = asyncio.run(contributions.get_contributions(
        Settings(github_token=None), "octocat", date(2025, 1, 1), date(2026, 1, 1), "month", None,
        trend_weeks=trend_weeks,
        activity_scope="selected",
    ))
    expected = sum(value or 0 for value in repository_counts)
    assert len(calls) == 2
    assert response.activity.repositories == expected
    assert response.activity.commits == 2
    assert response.meta.total_contributions == 2 + expected
    assert len(response.daily) == 366
    assert response.meta.start_date == date(2025, 1, 1)
    assert response.meta.end_date == date(2026, 1, 1)
    if trend_weeks:
        assert len(response.trend) == 5
        assert response.meta.aggregation == "week"
        assert sum(point.count for point in response.trend) == 1 + (repository_counts[1] or 0)
    else:
        assert sum(point.count for point in response.trend) == response.meta.total_contributions
    assert response.model_dump()["activity"]["repositories"] == expected


@pytest.mark.parametrize("end, expected", [
    ("2026-09-21", [7, 7, 7, 7, 1]),
    ("2026-09-27", [7, 7, 7, 7, 7]),
    ("2026-01-01", [7, 7, 7, 7, 4]),
    ("2024-03-01", [7, 7, 7, 7, 5]),
])
def test_recent_five_calendar_weeks(end, expected):
    frame = pd.DataFrame({"date": pd.date_range(end=end, periods=90).date, "count": [1] * 90})
    original = frame.copy(deep=True)
    points = build_trend(frame, "month", 5)
    assert len(points) == 5
    assert [p.count for p in points] == expected
    assert points[0].start_date.weekday() == 0
    assert points[-1].end_date == date.fromisoformat(end)
    assert all(a.end_date + timedelta(days=1) == b.start_date for a, b in zip(points, points[1:]))
    pd.testing.assert_frame_equal(frame, original)


def test_recent_weeks_do_not_fabricate_data_outside_short_query():
    frame = pd.DataFrame({"date": pd.date_range("2026-09-20", "2026-09-21").date, "count": [0, 0]})
    points = build_trend(frame, "day", 5)
    assert [p.count for p in points] == [0, 0]
    assert points[0].start_date == date(2026, 9, 20)
    assert points[-1].end_date == date(2026, 9, 21)
    assert build_trend(frame.iloc[:0], "week", 5) == []
