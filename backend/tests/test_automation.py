from datetime import date

import pytest
from pydantic import ValidationError

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
            ContributionDay(date=date(2026, 6, 2), count=5, color="#366ff2", weekday=2),
        ],
        trend=[
            TrendPoint(label="2026-06", start_date=date(2026, 6, 1), end_date=date(2026, 6, 2), count=7),
        ],
        activity=ActivityBreakdown(commits=5, pull_requests=1, issues=1, code_reviews=0),
        meta=QueryMeta(
            start_date=date(2026, 6, 1),
            end_date=date(2026, 6, 2),
            aggregation="month",
            total_contributions=7,
            active_days=2,
            longest_streak=2,
            restricted_contributions=0,
        ),
    )

    svg = render_contribution_svg(response)
    assert "<animate" in svg
    assert "@octocat" in svg
    assert "DAILY HEATMAP" in svg
