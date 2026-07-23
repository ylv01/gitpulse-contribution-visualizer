from __future__ import annotations

import base64
from datetime import date, datetime
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

import httpx

from ..config import Settings
from ..github_client import GitHubAPIError
from ..models import AutomationRunResponse
from .automation_config import GENERATED_DIR, load_automation_config, load_automation_token
from .contributions import get_contributions
from .svg_report import render_contribution_svg


def _end_date(config) -> date:
    if config.end_mode == "fixed":
        assert config.end_date is not None
        return config.end_date
    try:
        return datetime.now(ZoneInfo(config.time_zone)).date()
    except Exception as exc:
        raise ValueError(f"无效时区：{config.time_zone}") from exc


async def _push_svg(config, token: str, content: str) -> tuple[str, str | None]:
    owner, repository = config.target_repository.split("/", 1)
    encoded_path = quote(config.target_path, safe="/")
    url = f"https://api.github.com/repos/{quote(owner)}/{quote(repository)}/contents/{encoded_path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "gitpulse-automation",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=45, headers=headers) as client:
        existing = await client.get(url, params={"ref": config.target_branch})
        sha: str | None = None
        if existing.status_code == 200:
            payload = existing.json()
            sha = payload.get("sha")
            current = base64.b64decode(payload.get("content", "")).decode("utf-8")
            if current == content:
                return "unchanged", None
        elif existing.status_code != 404:
            raise GitHubAPIError(f"读取目标 SVG 失败：GitHub API HTTP {existing.status_code}", existing.status_code)

        body = {
            "message": f"chore: update contribution report {date.today():%Y-%m-%d}",
            "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
            "branch": config.target_branch,
        }
        if sha:
            body["sha"] = sha
        response = await client.put(url, json=body)
        if response.status_code not in {200, 201}:
            detail = response.json().get("message", f"HTTP {response.status_code}")
            raise GitHubAPIError(f"推送目标 SVG 失败：{detail}", response.status_code)
        commit_url = response.json().get("commit", {}).get("html_url")
        return "pushed", commit_url


async def run_automation(settings: Settings, push: bool) -> AutomationRunResponse:
    config = load_automation_config()
    token = load_automation_token()
    if not token:
        raise GitHubAPIError("尚未保存自动化 Token。", 401)
    end_date = _end_date(config)
    if config.start_date > end_date:
        raise ValueError("自动化开始日期晚于当前结束日期")

    data = await get_contributions(
        settings=settings,
        username=config.username,
        start_date=config.start_date,
        end_date=end_date,
        aggregation=config.aggregation,
        token=token,
    )
    svg = render_contribution_svg(data)

    if push:
        status, commit_url = await _push_svg(config, token, svg)
        if status == "unchanged":
            return AutomationRunResponse(status="unchanged", message="远端 SVG 已是最新内容，无需提交。")
        return AutomationRunResponse(status="pushed", message="SVG 已正常提交到目标仓库。", commit_url=commit_url)

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = GENERATED_DIR / Path(config.target_path).name
    output_path.write_text(svg, encoding="utf-8")
    return AutomationRunResponse(
        status="generated",
        message="测试 SVG 已在本地生成，未执行 GitHub 推送。",
        output_path=str(output_path),
    )
