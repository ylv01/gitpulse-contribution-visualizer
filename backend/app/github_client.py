from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any

import httpx

from .config import Settings


CONTRIBUTIONS_QUERY = """
query ContributionDashboard($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    name
    avatarUrl
    url
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            color
            weekday
          }
        }
      }
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
    }
  }
}
"""


class GitHubAPIError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def _iso_start(value: date) -> str:
    return datetime.combine(value, time.min, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def _iso_end(value: date) -> str:
    return datetime.combine(value, time.max.replace(microsecond=0), tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


class GitHubClient:
    def __init__(self, settings: Settings, request_token: str | None = None) -> None:
        self.settings = settings
        self.token = request_token or settings.github_token

    async def __aenter__(self) -> "GitHubClient":
        if not self.token:
            raise GitHubAPIError(
                "GitHub GraphQL API 需要 Token。请在页面输入 Token，或在后端 .env 配置 GITHUB_TOKEN。",
                401,
            )
        self._client = httpx.AsyncClient(
            timeout=self.settings.request_timeout_seconds,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "github-contribution-visualizer",
            },
        )
        return self

    async def __aexit__(self, *_: object) -> None:
        await self._client.aclose()

    async def fetch_period(self, username: str, start_date: date, end_date: date) -> dict[str, Any]:
        try:
            response = await self._client.post(
                self.settings.github_graphql_url,
                json={
                    "query": CONTRIBUTIONS_QUERY,
                    "variables": {
                        "login": username,
                        "from": _iso_start(start_date),
                        "to": _iso_end(end_date),
                    },
                },
            )
        except httpx.TimeoutException as exc:
            raise GitHubAPIError("GitHub API 请求超时，请稍后重试。", 504) from exc
        except httpx.HTTPError as exc:
            raise GitHubAPIError("无法连接 GitHub API，请检查网络配置。", 502) from exc

        if response.status_code in {401, 403}:
            detail = "Token 无效或权限不足" if response.status_code == 401 else "GitHub API 限流或拒绝访问"
            raise GitHubAPIError(f"{detail}，请检查 Token 后重试。", response.status_code)
        if response.status_code >= 400:
            raise GitHubAPIError(f"GitHub API 返回异常状态 {response.status_code}。", 502)

        payload = response.json()
        if payload.get("errors"):
            message = payload["errors"][0].get("message", "GitHub GraphQL 查询失败")
            status = 404 if "Could not resolve to a User" in message else 502
            raise GitHubAPIError("未找到该 GitHub 用户。" if status == 404 else message, status)

        user = payload.get("data", {}).get("user")
        if not user:
            raise GitHubAPIError("未找到该 GitHub 用户。", 404)
        return user

