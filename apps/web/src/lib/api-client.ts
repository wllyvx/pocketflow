const apiUrl = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8787";

type ApiError = {
  success: false;
  error: { code: string; message: string };
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  onboardingStatus: "pending" | "completed" | "skipped";
};

export type OnboardingStatus = {
  status: CurrentUser["onboardingStatus"];
  canSkip: boolean;
};

export type DashboardData = {
  availableToSpend: number;
  monthlyIncome: number;
  spent: number;
  healthScore: number;
  envelopes: Array<{ id: string; name: string; budgetedAmount: number; currentAmount: number }>;
  transactions: Array<{ id: string; description: string; amount: number; type: string; date: string }>;
};

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = await response.json() as T | ApiError;
  if (!response.ok || (body as ApiError).success === false) {
    const message = (body as ApiError).error?.message ?? `API request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export async function getApiHello(token: string) {
  return request<{ success: true; data: { message: string; userId: string } }>("/api/hello", token);
}

export async function getCurrentUser(token: string) {
  return request<{ success: true; data: CurrentUser }>("/api/users/me", token);
}

export async function getOnboardingStatus(token: string) {
  return request<{ success: true; data: OnboardingStatus }>("/api/onboarding", token);
}

export async function getDashboard(token: string) {
  return request<{ success: true; data: DashboardData }>("/api/dashboard", token);
}

export async function completeOnboarding(token: string, input: { displayName: string; skip: boolean; starterEnvelopes: string[] }) {
  return request<{ success: true; data: { status: CurrentUser["onboardingStatus"] } }>("/api/onboarding", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
