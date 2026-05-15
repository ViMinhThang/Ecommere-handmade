import { API_BASE_URL, apiClient } from './client';
import type { ChatConversationSummary, ChatMessage, CursorResponse } from '@/types';

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

export const chatApi = {
  startConversation: (data: StartConversationDto) =>
    apiClient.post<ChatConversationSummary>('/chat/conversations', data),

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

    return apiClient.post<ChatMessage>(
      `/chat/conversations/${conversationId}/messages/image`,
      formData,
    );
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
