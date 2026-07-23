from __future__ import annotations

import json
import os
from pathlib import Path

from ..models import AutomationConfig


PROJECT_ROOT = Path(__file__).resolve().parents[3]
AUTOMATION_DIR = PROJECT_ROOT / "automation"
CONFIG_PATH = AUTOMATION_DIR / "config.local.json"
TOKEN_PATH = AUTOMATION_DIR / ".env.local"
GENERATED_DIR = AUTOMATION_DIR / "generated"


def load_automation_config() -> AutomationConfig:
    if not CONFIG_PATH.exists():
        return AutomationConfig()
    return AutomationConfig.model_validate_json(CONFIG_PATH.read_text(encoding="utf-8"))


def save_automation_config(config: AutomationConfig) -> None:
    AUTOMATION_DIR.mkdir(parents=True, exist_ok=True)
    temporary = CONFIG_PATH.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(config.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(CONFIG_PATH)


def _parse_env_file() -> dict[str, str]:
    if not TOKEN_PATH.exists():
        return {}
    values: dict[str, str] = {}
    for raw_line in TOKEN_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'\"")
    return values


def automation_token_configured() -> bool:
    return bool(load_automation_token())


def load_automation_token() -> str | None:
    return os.getenv("GITPULSE_AUTOMATION_TOKEN") or _parse_env_file().get("GITPULSE_AUTOMATION_TOKEN")


def save_automation_token(token: str) -> None:
    normalized = token.strip()
    if not normalized or "\n" in normalized or "\r" in normalized:
        raise ValueError("Token 不能为空或包含换行符")
    AUTOMATION_DIR.mkdir(parents=True, exist_ok=True)
    TOKEN_PATH.write_text(
        "# Local automation secret. This file is ignored by Git.\n"
        f"GITPULSE_AUTOMATION_TOKEN={normalized}\n",
        encoding="utf-8",
    )
    try:
        TOKEN_PATH.chmod(0o600)
    except OSError:
        pass


def delete_automation_token() -> None:
    if TOKEN_PATH.exists():
        TOKEN_PATH.unlink()
