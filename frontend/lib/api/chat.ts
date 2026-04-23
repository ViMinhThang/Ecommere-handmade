import { API_BASE_URL, apiClient } from './client';
import type { ChatConversationSummary, ChatMessage, CursorResponse } from '@/types';

const ACCESS_TOKEN_STORAGE_KEY = 'auth_access_token_client';

export interface StartConversationDto {
  sellerId: string;
  productId?: string;
}

export interface SendTextMessageDto {
  text: string;
}

export interface CursorParams {
  cursor?: string;
  limit?: number;
}

function toQueryString(params?: CursorParams): string {
  if (!params) {
    return '';
  }

  const query = new URLSearchParams();
  if (params.cursor) {
    query.set('cursor', params.cursor);
  }
  if (params.limit) {
    query.set('limit', String(params.limit));
  }

  const value = query.toString();
  return value ? `?${value}` : '';
}

function getAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export const chatApi = {
  startConversation: (data: StartConversationDto) =>
    apiClient.post<ChatConversationSummary>('/chat/conversations/start', data),

  getConversations: (params?: CursorParams) =>
    apiClient.get<CursorResponse<ChatConversationSummary>>(
      `/chat/conversations${toQueryString(params)}`,
    ),

  getMessages: (conversationId: string, params?: CursorParams) =>
    apiClient.get<CursorResponse<ChatMessage>>(
      `/chat/conversations/${conversationId}/messages${toQueryString(params)}`,
    ),

  sendTextMessage: (conversationId: string, data: SendTextMessageDto) =>
    apiClient.post<ChatMessage>(
      `/chat/conversations/${conversationId}/messages/text`,
      data,
    ),

  sendCustomOrderOffer: (
    conversationId: string,
    data: { customOrderId: string; message: string },
  ) =>
    apiClient.post<ChatMessage>(
      `/chat/conversations/${conversationId}/messages/offer`,
      data,
    ),

  sendImageMessage: async (
    conversationId: string,
    file: File,
    caption?: string,
  ) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      throw new Error('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB.');
    }

    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }

    const accessToken = getAccessTokenFromStorage();
    const headers = new Headers();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${API_BASE_URL}/chat/conversations/${conversationId}/messages/image`,
      {
        method: 'POST',
        credentials: 'include',
        body: formData,
        headers,
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: 'Failed to upload chat image' }));
      throw new Error(error.message || 'Failed to upload chat image');
    }

    return (await response.json()) as ChatMessage;
  },

  markConversationRead: (conversationId: string) =>
    apiClient.post<{ conversationId: string; lastReadAt: string }>(
      `/chat/conversations/${conversationId}/read`,
      {},
    ),

  getUnreadCount: () => apiClient.get<{ unreadCount: number }>('/chat/unread-count'),

  getUploadUrl: (uploadPath: string) => {
    if (!uploadPath) {
      return '';
    }
    if (uploadPath.startsWith('http') || uploadPath.startsWith('data:')) {
      return uploadPath;
    }

    const normalizedPath = uploadPath.replace(/^\/+/, '');
    const baseUrl = API_BASE_URL.replace(/\/v\d+$/, '');
    return `${baseUrl}/uploads/${normalizedPath}`;
  },
};
