from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, SecretStr, model_validator


Aggregation = Literal["day", "week", "month"]


class ContributionRequest(BaseModel):
    username: str = Field(min_length=1, max_length=39, pattern=r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$")
    token: SecretStr | None = None
    start_date: date
    end_date: date
    aggregation: Aggregation = "day"

    @model_validator(mode="after")
    def validate_date_range(self) -> "ContributionRequest":
        if self.start_date > self.end_date:
            raise ValueError("开始日期不能晚于结束日期")
        if (self.end_date - self.start_date).days > 3653:
            raise ValueError("MVP 单次查询最多支持 10 年")
        return self


class UserProfile(BaseModel):
    login: str
    name: str | None = None
    avatar_url: str
    profile_url: str


class ContributionDay(BaseModel):
    date: date
    count: int
    color: str
    weekday: int


class TrendPoint(BaseModel):
    label: str
    start_date: date
    end_date: date
    count: int


class ActivityBreakdown(BaseModel):
    commits: int = 0
    pull_requests: int = 0
    issues: int = 0
    code_reviews: int = 0


class QueryMeta(BaseModel):
    start_date: date
    end_date: date
    aggregation: Aggregation
    total_contributions: int
    active_days: int
    longest_streak: int
    restricted_contributions: int


class ContributionResponse(BaseModel):
    user: UserProfile
    daily: list[ContributionDay]
    trend: list[TrendPoint]
    activity: ActivityBreakdown
    meta: QueryMeta

