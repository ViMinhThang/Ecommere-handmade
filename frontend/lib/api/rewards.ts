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

export const rewardsApi = {
  getBalance: () => apiClient.get<RewardBalance>("/rewards/balance"),

  getLedger: (page = 1, limit = 20) =>
    apiClient.get<RewardLedgerResponse>(
      `/rewards/ledger?page=${page}&limit=${limit}`,
    ),
};
