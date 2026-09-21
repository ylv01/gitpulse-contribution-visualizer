export type Aggregation = "day" | "week" | "month";

export interface ChartRange {
  mode: "recent" | "custom";
  unit: Aggregation;
  count: number;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ContributionRequest {
  username: string;
  token?: string;
  start_date: string;
  end_date: string;
  aggregation: Aggregation;
  trend_weeks?: number | null;
  trend_range?: ChartRange | null;
  heatmap_range?: ChartRange | null;
  activity_scope?: "all" | "selected";
}

export interface UserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  profile_url: string;
}

export interface ContributionDay {
  date: string;
  count: number;
  color: string;
  weekday: number;
}

export interface TrendPoint {
  label: string;
  start_date: string;
  end_date: string;
  count: number;
}

export interface ActivityBreakdown {
  commits: number;
  pull_requests: number;
  issues: number;
  code_reviews: number;
  repositories: number;
}

export interface ContributionResponse {
  user: UserProfile;
  daily: ContributionDay[];
  trend: TrendPoint[];
  activity: ActivityBreakdown;
  meta: {
    start_date: string;
    end_date: string;
    aggregation: Aggregation;
    trend_weeks?: number | null;
    total_contributions: number;
    active_days: number;
    longest_streak: number;
    restricted_contributions: number;
    trend_start_date?: string | null;
    trend_end_date?: string | null;
    activity_start_date?: string | null;
    activity_end_date?: string | null;
    activity_scope?: "all" | "selected";
    activity_restricted_contributions?: number;
  };
}

export type AutomationEndMode = "today" | "fixed";

export interface AutomationConfig {
  enabled: boolean;
  username: string;
  start_date: string;
  end_mode: AutomationEndMode;
  end_date: string | null;
  aggregation: Aggregation;
  trend_weeks?: number | null;
  trend_range?: ChartRange | null;
  heatmap_range?: ChartRange | null;
  activity_scope?: "all" | "selected";
  schedule_time: string;
  time_zone: string;
  require_proxy: boolean;
  target_repository: string;
  target_branch: string;
  target_path: string;
}

export interface AutomationConfigResponse {
  config: AutomationConfig;
  token_configured: boolean;
}

export interface AutomationRunResponse {
  status: "generated" | "pushed" | "unchanged";
  message: string;
  output_path?: string | null;
  commit_url?: string | null;
}
