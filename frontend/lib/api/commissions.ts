import { apiClient } from './client';

export type CommissionPostStatus = 'OPEN' | 'ASSIGNED' | 'CLOSED' | 'CANCELLED';
export type CommissionProposalStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface CommissionProposal {
  id: string;
  commissionId: string;
  sellerId: string;
  message: string;
  proposedPrice: string;
  proposedLeadTime: string;
  sketchImageUrl: string | null;
  status: CommissionProposalStatus;
  createdAt: string;
  updatedAt: string;
  seller?: {
    id: string;
    name: string;
    shopName?: string | null;
    avatar?: string | null;
  };
}

export interface CommissionPost {
  id: string;
  customerId: string;
  selectedProposalId: string | null;
  customOrderId: string | null;
  title: string;
  description: string;
  budgetMin: string | null;
  budgetMax: string | null;
  desiredTimeline: string | null;
  referenceImages: string[];
  status: CommissionPostStatus;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  proposals: CommissionProposal[];
  selectedProposal?: CommissionProposal | null;
}

export interface CreateCommissionPostInput {
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  desiredTimeline?: string;
  referenceImages?: string[];
}

export interface CreateCommissionProposalInput {
  message: string;
  proposedPrice: number;
  proposedLeadTime: string;
  sketchImageUrl?: string;
}

export const commissionsApi = {
  createPost: (data: CreateCommissionPostInput) =>
    apiClient.post<CommissionPost>('/commissions', data),

  getMyPosts: () => apiClient.get<CommissionPost[]>('/commissions/my-posts'),

  getOpenPosts: () => apiClient.get<CommissionPost[]>('/commissions/open'),

  getMyProposals: () =>
    apiClient.get<Array<CommissionProposal & { commission: CommissionPost }>>(
      '/commissions/my-proposals',
    ),

  getById: (id: string) => apiClient.get<CommissionPost>(`/commissions/${id}`),

  submitProposal: (id: string, data: CreateCommissionProposalInput) =>
    apiClient.post<CommissionProposal>(`/commissions/${id}/proposals`, data),

  updateProposal: (proposalId: string, data: Partial<CreateCommissionProposalInput>) =>
    apiClient.patch<CommissionProposal>(`/commissions/proposals/${proposalId}`, data),

  withdrawProposal: (proposalId: string) =>
    apiClient.patch<CommissionProposal>(
      `/commissions/proposals/${proposalId}/withdraw`,
      {},
    ),

  chooseProposal: (id: string, proposalId: string) =>
    apiClient.post<{ id: string }>(
      `/commissions/${id}/proposals/${proposalId}/choose`,
      {},
    ),

  closePost: (id: string) =>
    apiClient.patch<CommissionPost>(`/commissions/${id}/close`, {}),
};
