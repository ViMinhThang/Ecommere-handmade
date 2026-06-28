import { apiClient } from "./client";

export type RewardPointLedgerType =
  | "EARN"
  | "REDEEM"
  | "REFUND"
  | "ADJUSTMENT"
  | "EXPIRE";

export interface RewardBalance {
  balance: number;
  redeemVndPerPoint: number;
  earnVndPerPoint: number;
}

export interface RewardLedgerEntry {
  id: string;
  userId: string;
  orderId?: string | null;
  type: RewardPointLedgerType;
  points: number;
  balanceAfter: number;
  description?: string | null;
  adjustedByAdminId?: string | null;
  createdAt: string;
}

export interface RewardLedgerResponse {
  data: RewardLedgerEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminRewardSummary {
  totalPoints: number;
  usersWithPoints: number;
  adjustments: number;
}

export interface AdminRewardUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  roles: string[];
  status: string;
  rewardPointsBalance: number;
  ledgerEntries: number;
}

export interface AdminRewardUsersResponse {
  data: AdminRewardUser[];
  meta: RewardLedgerResponse["meta"];
}

export interface AdminRewardAdjustment {
  points: number;
  reason: string;
}

export const rewardsApi = {
  getBalance: () => apiClient.get<RewardBalance>("/rewards/balance"),

  getLedger: (page = 1, limit = 20) =>
    apiClient.get<RewardLedgerResponse>(
      `/rewards/ledger?page=${page}&limit=${limit}`,
    ),

  getAdminSummary: () =>
    apiClient.get<AdminRewardSummary>("/rewards/admin/summary"),

  getAdminUsers: (query = "", page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (query.trim()) {
      params.set("q", query.trim());
    }
    return apiClient.get<AdminRewardUsersResponse>(
      `/rewards/admin/users?${params.toString()}`,
    );
  },

  getAdminUserLedger: (userId: string, page = 1, limit = 20) =>
    apiClient.get<RewardLedgerResponse>(
      `/rewards/admin/users/${userId}/ledger?page=${page}&limit=${limit}`,
    ),

  adjustAdminUserPoints: (
    userId: string,
    adjustment: AdminRewardAdjustment,
  ) =>
    apiClient.post<{ ledger: RewardLedgerEntry }>(
      `/rewards/admin/users/${userId}/adjustments`,
      adjustment,
    ),
};
