import asyncio
from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.models import ChartRange, ContributionRequest, AutomationConfig
from app.services import contributions
from app.services.contributions import resolve_chart_range


@pytest.mark.parametrize("unit,count,end,expected", [
    ("day", 7, date(2026, 1, 3), date(2025, 12, 28)),
    ("week", 5, date(2026, 9, 21), date(2026, 8, 24)),
    ("month", 3, date(2026, 1, 3), date(2025, 11, 1)),
    ("month", 1, date(2024, 2, 29), date(2024, 2, 1)),
])
def test_recent_range_boundaries(unit, count, end, expected):
    selection = ChartRange(unit=unit, count=count)
    assert resolve_chart_range(selection, date(2026, 1, 1), end) == (expected, end)


@pytest.mark.parametrize("payload", [
    {"count": 0}, {"unit": "month", "count": 121},
    {"mode": "custom"},
    {"mode": "custom", "start_date": "2026-02-01", "end_date": "2026-01-01"},
    {"mode": "custom", "start_date": "2000-01-01", "end_date": "2026-01-01"},
])
def test_invalid_range_rejected(payload):
    with pytest.raises(ValidationError):
        ChartRange(**payload)


def test_chart_config_roundtrip():
    config = AutomationConfig(
        trend_range=ChartRange(unit="week", count=5),
        heatmap_range=ChartRange(mode="custom", start_date=date(2026, 4, 1), end_date=date(2026, 9, 21)),
    )
    assert config.activity_scope == "all"
    assert AutomationConfig.model_validate_json(config.model_dump_json()) == config
    request = ContributionRequest(username="octocat", start_date=date(2026, 1, 1), end_date=date(2026, 9, 21))
    assert request.activity_scope == "all"


def test_history_and_chart_ranges_are_independent(monkeypatch):
    class FrozenDate(date):
        @classmethod
        def today(cls):
            return cls(2026, 9, 21)

    calls = []

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def fetch_period(self, username, first, last):
            assert (last - first).days <= 364
            calls.append((first, last))
            days = (last - first).days + 1
            return {
                "login": username, "createdAt": "2010-01-01T12:00:00Z",
                "avatarUrl": "https://example.com/a.png", "url": "https://github.com/octocat",
                "contributionsCollection": {
                    "totalCommitContributions": days,
                    "contributionCalendar": {"weeks": [{"contributionDays": [
                        {"date": str(first + timedelta(days=i)), "contributionCount": 1}
                        for i in range(days)
                    ]}]},
                },
            }

    monkeypatch.setattr(contributions, "date", FrozenDate)
    monkeypatch.setattr(contributions, "GitHubClient", FakeClient)
    args = dict(settings=Settings(github_token=None), username="octocat", token=None,
                start_date=date(2026, 4, 1), end_date=date(2026, 9, 21), aggregation="week")
    first = asyncio.run(contributions.get_contributions(
        **args, trend_range=ChartRange(unit="week", count=5), heatmap_range=ChartRange(unit="day", count=7),
    ))
    assert len(calls) == len(set(calls))  # Request-local cache avoids exact repeated periods.
    assert len(first.trend) == 5 and len(first.daily) == 7
    assert sum(p.count for p in first.trend) == 29
    assert first.meta.total_contributions == 7
    assert first.meta.trend_start_date == date(2026, 8, 24)
    assert first.meta.start_date == date(2026, 9, 15)
    expected_history = (date(2026, 9, 21) - date(2010, 1, 1)).days + 1
    assert first.activity.commits == expected_history
    assert first.meta.activity_start_date == date(2010, 1, 1)
    calls.clear()
    second = asyncio.run(contributions.get_contributions(
        **args, trend_range=ChartRange(unit="day", count=3), heatmap_range=ChartRange(unit="month", count=2),
    ))
    assert first.activity == second.activity
    assert second.meta.start_date == date(2026, 8, 1)
    assert sum(p.count for p in second.trend) == 3
    selected = asyncio.run(contributions.get_contributions(**args, activity_scope="selected"))
    assert selected.activity.commits == (args["end_date"] - args["start_date"]).days + 1


def test_svg_api_keeps_independent_range_metadata():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.models import ActivityBreakdown, ContributionResponse, QueryMeta, TrendPoint, UserProfile
    report = ContributionResponse(
        user=UserProfile(login="octocat", avatar_url="https://example.com/a.png", profile_url="https://github.com/octocat"),
        daily=[], activity=ActivityBreakdown(commits=123, repositories=2),
        trend=[TrendPoint(label="2026-09", start_date=date(2026, 9, 1), end_date=date(2026, 9, 21), count=10)],
        meta=QueryMeta(start_date=date(2026, 4, 1), end_date=date(2026, 9, 21), aggregation="month",
                       total_contributions=0, active_days=0, longest_streak=0, restricted_contributions=0,
                       activity_scope="all", activity_start_date=date(2010, 1, 1), activity_end_date=date(2026, 9, 21)),
    )
    result = TestClient(app).post("/api/reports/svg", json=report.model_dump(mode="json"))
    assert result.status_code == 200
    assert "活动类型分布 · 全部历史" in result.text
    assert 'class="activity-total">125</text>' in result.text
