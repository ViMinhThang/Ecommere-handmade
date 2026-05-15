import { apiClient } from './client';
import type { RewardBalance, RewardLedgerResponse } from '@/types';

export const rewardsApi = {
  getBalance: () => apiClient.get<RewardBalance>('/rewards/balance'),

  getLedger: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();

    return apiClient.get<RewardLedgerResponse>(
      `/rewards/ledger${queryString ? `?${queryString}` : ''}`,
    );
  },
};
