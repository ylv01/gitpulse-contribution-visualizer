from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .github_client import GitHubAPIError
from .models import (
    AutomationConfig,
    AutomationConfigRequest,
    AutomationConfigResponse,
    AutomationRunRequest,
    AutomationRunResponse,
    ContributionRequest,
    ContributionResponse,
)
from .services.automation import run_automation
from .services.automation_config import (
    automation_token_configured,
    delete_automation_token,
    load_automation_config,
    save_automation_config,
    save_automation_token,
)
from .services.contributions import get_contributions


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="GitHub contribution analytics powered by GraphQL and pandas.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.post("/api/contributions", response_model=ContributionResponse)
async def contributions(request: ContributionRequest) -> ContributionResponse:
    try:
        return await get_contributions(
            settings=settings,
            username=request.username,
            start_date=request.start_date,
            end_date=request.end_date,
            aggregation=request.aggregation,
            token=request.token.get_secret_value() if request.token else None,
        )
    except GitHubAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.get("/api/automation/config", response_model=AutomationConfigResponse)
async def get_automation_config() -> AutomationConfigResponse:
    return AutomationConfigResponse(
        config=load_automation_config(),
        token_configured=automation_token_configured(),
    )


@app.put("/api/automation/config", response_model=AutomationConfigResponse)
async def put_automation_config(request: AutomationConfigRequest) -> AutomationConfigResponse:
    config = AutomationConfig.model_validate(request.model_dump(exclude={"token"}))
    save_automation_config(config)
    if request.token and request.token.get_secret_value().strip():
        try:
            save_automation_token(request.token.get_secret_value())
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    return AutomationConfigResponse(config=config, token_configured=automation_token_configured())


@app.delete("/api/automation/token")
async def remove_automation_token() -> dict[str, bool]:
    delete_automation_token()
    return {"token_configured": False}


@app.post("/api/automation/run", response_model=AutomationRunResponse)
async def execute_automation(request: AutomationRunRequest) -> AutomationRunResponse:
    try:
        return await run_automation(settings, push=request.push)
    except GitHubAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
