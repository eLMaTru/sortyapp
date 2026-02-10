import type { ApiResponse } from '@sortyapp/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sortyapp_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }

  return json.data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (data: { email: string; username: string; password: string; referralCode?: string }) =>
      request<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<any>('/auth/me'),
    updateWalletAddress: (walletAddress: string) =>
      request<void>('/auth/wallet-address', { method: 'PUT', body: JSON.stringify({ walletAddress }) }),
  },

  draws: {
    list: (mode: string, status?: string) =>
      request<any[]>(`/draws?mode=${mode}${status ? `&status=${status}` : ''}`),
    get: (drawId: string) => request<any>(`/draws/${drawId}`),
    join: (drawId: string) =>
      request<any>('/draws/join', { method: 'POST', body: JSON.stringify({ drawId }) }),
    templates: () => request<any[]>('/draws/templates'),
    chatMessages: (drawId: string) => request<any[]>(`/draws/${drawId}/chat`),
    sendChatMessage: (drawId: string, content: string) =>
      request<any>(`/draws/${drawId}/chat`, { method: 'POST', body: JSON.stringify({ content }) }),
    rankings: (mode: string) => request<any[]>(`/draws/rankings?mode=${mode}`),
  },

  wallet: {
    transactions: () => request<any[]>('/wallet/transactions'),
    withdraw: (data: { amountCredits: number; walletAddress: string }) =>
      request<any>('/wallet/withdraw', { method: 'POST', body: JSON.stringify(data) }),
    withdrawals: () => request<any[]>('/wallet/withdrawals'),
    cancelWithdrawal: (withdrawalId: string) =>
      request<any>(`/wallet/withdrawals/${withdrawalId}/cancel`, { method: 'POST' }),
    depositMethods: () => request<any[]>('/wallet/deposit-methods'),
    createDepositRequest: (data: { method: string; amountUSDC: number; reference?: string }) =>
      request<any>('/wallet/deposit-request', { method: 'POST', body: JSON.stringify(data) }),
    depositRequests: () => request<any[]>('/wallet/deposit-requests'),
  },

  admin: {
    users: () => request<any[]>('/admin/users'),
    simulateDeposit: (userId: string, amountCredits: number) =>
      request<any>('/admin/simulate-deposit', { method: 'POST', body: JSON.stringify({ userId, amountCredits }) }),
    pendingWithdrawals: () => request<any[]>('/admin/withdrawals'),
    approveWithdrawal: (withdrawalId: string, txHash: string) =>
      request<any>('/admin/withdrawals/approve', { method: 'POST', body: JSON.stringify({ withdrawalId, txHash }) }),
    templates: () => request<any[]>('/admin/templates'),
    createTemplate: (data: { slots: number; entryDollars: number; requiresDeposit: boolean; enabled: boolean }) =>
      request<any>('/admin/templates', { method: 'POST', body: JSON.stringify(data) }),
    updateTemplate: (data: { templateId: string; enabled?: boolean; slots?: number; entryDollars?: number; requiresDeposit?: boolean }) =>
      request<any>('/admin/templates', { method: 'PUT', body: JSON.stringify(data) }),
    draws: (mode: string) => request<any[]>(`/admin/draws?mode=${mode}`),
    forceFinalize: (drawId: string) =>
      request<any>(`/admin/draws/${drawId}/force-finalize`, { method: 'POST' }),
    ensureOpenDraws: () => request<any>('/admin/ensure-open-draws', { method: 'POST' }),
    metrics: () => request<any>('/admin/metrics'),
    pendingDepositRequests: () => request<any[]>('/admin/deposit-requests'),
    reviewDepositRequest: (data: { depositRequestId: string; action: 'APPROVE' | 'REJECT'; adminNote?: string }) =>
      request<any>('/admin/deposit-requests/review', { method: 'POST', body: JSON.stringify(data) }),
  },
};
