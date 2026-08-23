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

// --- Transaction CRUD API functions ---
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type ListTransactionsQuery,
  type TransactionItem,
  createEnvelopeSchema,
  deleteEnvelopeSchema,
  fillEnvelopeSchema,
  transferEnvelopeSchema,
  updateEnvelopeSchema,
  type CreateEnvelopeInput,
  type DeleteEnvelopeInput,
  type EnvelopeItem,
  type FillEnvelopeInput,
  type TransferEnvelopeInput,
  type UpdateEnvelopeInput,
  type AchievementItem,
  type AchievementUnlockNotification,
} from "@pocketflow/shared";

export type EnvelopeDeletePreview = {
  envelopeId: string;
  currentAmount: number;
  relatedTransactionCount: number;
  requiresBalanceAction: boolean;
};

export async function getEnvelopes(token: string) {
  return request<{ success: true; data: EnvelopeItem[] }>("/api/envelopes", token);
}

export async function getEnvelope(token: string, id: string) {
  return request<{ success: true; data: EnvelopeItem }>(`/api/envelopes/${id}`, token);
}

export async function getEnvelopeDeletePreview(token: string, id: string) {
  return request<{ success: true; data: EnvelopeDeletePreview }>(`/api/envelopes/${id}/delete-preview`, token);
}

export async function createEnvelope(token: string, input: CreateEnvelopeInput) {
  const parsed = createEnvelopeSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid envelope input: ${parsed.error.message}`);
  const response = await request<{ success: true; data: EnvelopeItem }>("/api/envelopes", token, { method: "POST", body: JSON.stringify(parsed.data) });
  notifyAchievementsUnlocked(response.data);
  return response;
}

export async function updateEnvelope(token: string, id: string, input: UpdateEnvelopeInput) {
  const parsed = updateEnvelopeSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid envelope update input: ${parsed.error.message}`);
  return request<{ success: true; data: EnvelopeItem }>(`/api/envelopes/${id}`, token, { method: "PUT", body: JSON.stringify(parsed.data) });
}

export async function fillEnvelope(token: string, id: string, input: FillEnvelopeInput) {
  const parsed = fillEnvelopeSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid envelope fill input: ${parsed.error.message}`);
  const response = await request<{ success: true; data: EnvelopeItem }>(`/api/envelopes/${id}/fill`, token, { method: "POST", body: JSON.stringify(parsed.data) });
  notifyAchievementsUnlocked(response.data);
  return response;
}

export async function transferEnvelope(token: string, input: TransferEnvelopeInput) {
  const parsed = transferEnvelopeSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid envelope transfer input: ${parsed.error.message}`);
  return request<{ success: true; message: string }>("/api/envelopes/transfer", token, { method: "POST", body: JSON.stringify(parsed.data) });
}

export async function deleteEnvelope(token: string, id: string, input: DeleteEnvelopeInput = { returnToAvailableToSpend: false }) {
  const parsed = deleteEnvelopeSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid envelope delete input: ${parsed.error.message}`);
  return request<{ success: true; message: string }>(`/api/envelopes/${id}`, token, { method: "DELETE", body: JSON.stringify(parsed.data) });
}

export async function getAchievements(token: string) {
  return request<{ success: true; data: AchievementItem[] }>("/api/achievements", token);
}

/** Dispatch a UI event when a mutating response carries newly unlocked achievements. */
export function notifyAchievementsUnlocked(data: unknown) {
  const unlocked = (data as { achievementsUnlocked?: AchievementUnlockNotification[] } | undefined)?.achievementsUnlocked;
  if (Array.isArray(unlocked) && unlocked.length > 0) {
    document.dispatchEvent(new CustomEvent("pocketflow:achievements-unlocked", { detail: unlocked }));
  }
}


/** Retrieve paginated list of transactions */
export async function getTransactions(token: string, query?: ListTransactionsQuery) {
  const qs = query
    ? `?${new URLSearchParams(
        Object.entries(query).reduce<Record<string, string>>((params, [key, value]) => {
          if (value !== undefined) params[key] = String(value);
          return params;
        }, {})
      ).toString()}`
    : "";
  return request<{
    success: true;
    data: TransactionItem[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      itemsPerPage: number;
    };
  }>(`/api/transactions${qs}`, token);
}

/** Retrieve a single transaction by ID */
export async function getTransactionById(token: string, id: string) {
  return request<{ success: true; data: TransactionItem }>(`/api/transactions/${id}`, token);
}

/** Create a new transaction */
export async function createTransaction(token: string, input: CreateTransactionInput) {
  // Client‑side validation using Zod schema
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid transaction input: ${parsed.error.message}`);
  }
  const response = await request<{ success: true; data: TransactionItem }>("/api/transactions", token, {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });
  notifyAchievementsUnlocked(response.data);
  return response;
}

/** Update an existing transaction */
export async function updateTransaction(token: string, id: string, input: UpdateTransactionInput) {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid transaction update input: ${parsed.error.message}`);
  }
  return request<{ success: true; data: TransactionItem }>(`/api/transactions/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(parsed.data),
  });
}

/** Delete a transaction */
export async function deleteTransaction(token: string, id: string) {
  return request<{ success: true; message: string }>(`/api/transactions/${id}`, token, {
    method: "DELETE",
  });
}
