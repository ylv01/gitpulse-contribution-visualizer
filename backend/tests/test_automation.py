from datetime import date
from xml.etree import ElementTree

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models import (
    ActivityBreakdown,
    AutomationConfig,
    ContributionDay,
    ContributionResponse,
    QueryMeta,
    TrendPoint,
    UserProfile,
)
from app.services import automation_config
from app.services.svg_report import render_contribution_svg


def test_automation_config_rejects_unsafe_target_path() -> None:
    with pytest.raises(ValidationError):
        AutomationConfig(target_path="../secret.svg")


def test_trend_window_config_round_trip_and_validation() -> None:
    config = AutomationConfig(start_date=date(2026, 4, 1), aggregation="week", trend_weeks=5)
    restored = AutomationConfig.model_validate_json(config.model_dump_json())
    assert restored.trend_weeks == 5
    assert restored.start_date == date(2026, 4, 1)
    assert AutomationConfig().trend_weeks is None
    for invalid in [0, -1, 53]:
        with pytest.raises(ValidationError):
            AutomationConfig(trend_weeks=invalid)


def test_automation_secret_is_stored_separately(tmp_path, monkeypatch) -> None:
    config_path = tmp_path / "config.local.json"
    token_path = tmp_path / ".env.local"
    monkeypatch.setattr(automation_config, "AUTOMATION_DIR", tmp_path)
    monkeypatch.setattr(automation_config, "CONFIG_PATH", config_path)
    monkeypatch.setattr(automation_config, "TOKEN_PATH", token_path)

    automation_config.save_automation_config(AutomationConfig())
    automation_config.save_automation_token("github_pat_test_value")

    assert "github_pat_test_value" not in config_path.read_text(encoding="utf-8")
    assert automation_config.load_automation_token() == "github_pat_test_value"
    assert token_path.exists()


def test_svg_report_contains_native_animations() -> None:
    response = ContributionResponse(
        user=UserProfile(login="octocat", name="Octocat", avatar_url="https://example.com/a.png", profile_url="https://github.com/octocat"),
        daily=[
            ContributionDay(date=date(2026, 6, 1), count=2, color="#174285", weekday=1),
            ContributionDay(date=date(2026, 6, 2), count=8, color="#366ff2", weekday=2),
        ],
        trend=[
            TrendPoint(label="2026-06", start_date=date(2026, 6, 1), end_date=date(2026, 6, 2), count=10),
        ],
        activity=ActivityBreakdown(commits=5, pull_requests=1, issues=1, code_reviews=0, repositories=3),
        meta=QueryMeta(
            start_date=date(2026, 6, 1),
            end_date=date(2026, 6, 2),
            aggregation="month",
            total_contributions=10,
            active_days=2,
            longest_streak=2,
            restricted_contributions=0,
        ),
    )

    svg = render_contribution_svg(response)
    ElementTree.fromstring(svg)
    assert "<animate" in svg
    assert "@octocat" in svg
    assert "SIGNAL / 01" in svg
    assert "贡献热力图" in svg
    assert "AUTOMATED VECTOR REPORT" not in svg
    assert "选定时间窗内的贡献强度变化" not in svg
    assert "公开活动的构成与协作偏好" not in svg
    assert "GitHub 风格日历矩阵" not in svg
    assert "Repositories  3" in svg
    assert "创建仓库" not in svg
    assert 'class="activity-total">10</text>' in svg
    assert 'stroke="#2dd4bf"' in svg

    api_response = TestClient(app).post("/api/reports/svg", json=response.model_dump(mode="json"))
    assert api_response.status_code == 200
    assert api_response.headers["content-type"].startswith("image/svg+xml")
    assert api_response.text == svg

    response.meta.trend_weeks = 5
    assert "贡献趋势 · 最近5周" in render_contribution_svg(response)

    response.activity = ActivityBreakdown(repositories=3)
    repository_only = render_contribution_svg(response)
    ElementTree.fromstring(repository_only)
    assert 'class="activity-total">3</text>' in repository_only
    assert "Repositories  3" in repository_only

    response.activity = ActivityBreakdown()
    assert "该时间段暂无分类活动" in render_contribution_svg(response)
