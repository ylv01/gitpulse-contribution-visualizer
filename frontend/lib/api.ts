import type {
  AutomationConfig,
  AutomationConfigResponse,
  AutomationRunResponse,
  ContributionRequest,
  ContributionResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function fetchContributions(input: ContributionRequest): Promise<ContributionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/contributions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    try {
      const payload = (await response.json()) as { detail?: string | Array<{ msg?: string }> };
      if (typeof payload.detail === "string") message = payload.detail;
      if (Array.isArray(payload.detail)) message = payload.detail.map((item) => item.msg).filter(Boolean).join("；");
    } catch {
      // Keep the status-based fallback message.
    }
    throw new Error(message);
  }

  return response.json() as Promise<ContributionResponse>;
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      // Keep the status fallback.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function fetchAutomationConfig(): Promise<AutomationConfigResponse> {
  return apiJson<AutomationConfigResponse>("/api/automation/config");
}

export function saveAutomationConfig(config: AutomationConfig, token?: string): Promise<AutomationConfigResponse> {
  return apiJson<AutomationConfigResponse>("/api/automation/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...config, token: token?.trim() || undefined }),
  });
}

export function runAutomation(push: boolean): Promise<AutomationRunResponse> {
  return apiJson<AutomationRunResponse>("/api/automation/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ push }),
  });
}

export function deleteAutomationToken(): Promise<{ token_configured: boolean }> {
  return apiJson<{ token_configured: boolean }>("/api/automation/token", { method: "DELETE" });
}
