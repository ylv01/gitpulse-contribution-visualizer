export type Aggregation = "day" | "week" | "month";

export interface ContributionRequest {
  username: string;
  token?: string;
  start_date: string;
  end_date: string;
  aggregation: Aggregation;
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
    total_contributions: number;
    active_days: number;
    longest_streak: number;
    restricted_contributions: number;
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
