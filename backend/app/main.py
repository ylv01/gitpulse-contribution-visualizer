from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .github_client import GitHubAPIError
from .models import ContributionRequest, ContributionResponse
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
    allow_methods=["GET", "POST", "OPTIONS"],
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

