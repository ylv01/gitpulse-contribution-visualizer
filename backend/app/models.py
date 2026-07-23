from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, SecretStr, model_validator


Aggregation = Literal["day", "week", "month"]
DateEndMode = Literal["today", "fixed"]


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


class AutomationConfig(BaseModel):
    enabled: bool = False
    username: str = Field(default="ylv01", min_length=1, max_length=39, pattern=r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$")
    start_date: date = date(2026, 6, 1)
    end_mode: DateEndMode = "today"
    end_date: date | None = None
    aggregation: Aggregation = "month"
    schedule_time: str = Field(default="09:00", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    time_zone: str = "Asia/Shanghai"
    require_proxy: bool = True
    target_repository: str = Field(default="ylv01/ylv01", pattern=r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
    target_branch: str = Field(default="main", min_length=1, max_length=255)
    target_path: str = "others_show/ylv01-contribution-report.svg"

    @model_validator(mode="after")
    def validate_automation(self) -> "AutomationConfig":
        if self.end_mode == "fixed" and self.end_date is None:
            raise ValueError("固定结束日期模式必须填写结束日期")
        if self.end_date and self.start_date > self.end_date:
            raise ValueError("开始日期不能晚于结束日期")
        normalized_path = self.target_path.replace("\\", "/").strip("/")
        if not normalized_path or ".." in normalized_path.split("/") or not normalized_path.lower().endswith(".svg"):
            raise ValueError("目标路径必须是仓库内安全的 .svg 文件路径")
        self.target_path = normalized_path
        if any(character.isspace() for character in self.target_branch):
            raise ValueError("目标分支不能包含空白字符")
        return self


class AutomationConfigRequest(AutomationConfig):
    token: SecretStr | None = None


class AutomationConfigResponse(BaseModel):
    config: AutomationConfig
    token_configured: bool


class AutomationRunRequest(BaseModel):
    push: bool = False


class AutomationRunResponse(BaseModel):
    status: Literal["generated", "pushed", "unchanged"]
    message: str
    output_path: str | None = None
    commit_url: str | None = None
