from __future__ import annotations

import asyncio
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config import get_settings  # noqa: E402
from app.services.automation import run_automation  # noqa: E402
from app.services.automation_config import load_automation_config  # noqa: E402


async def main() -> None:
    config = load_automation_config()
    if not config.enabled:
        print("GitPulse automation is disabled; skipping.")
        return
    result = await run_automation(get_settings(), push=True)
    print(result.message)
    if result.commit_url:
        print(result.commit_url)


if __name__ == "__main__":
    asyncio.run(main())
