import type { ContributionRequest, ContributionResponse } from "./types";

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

