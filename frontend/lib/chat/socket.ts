import { io, Socket } from 'socket.io-client';

const ACCESS_TOKEN_STORAGE_KEY = 'auth_access_token_client';

let chatSocket: Socket | null = null;

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

function getSocketBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return baseUrl.replace(/\/+$/, '').replace(/\/v\d+$/i, '');
}

export function ensureChatSocketConnected(): Socket | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = getAccessTokenFromStorage();
  if (!token) {
    return null;
  }

  if (!chatSocket) {
    chatSocket = io(`${getSocketBaseUrl()}/chat`, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket'],
    });
  }

  chatSocket.auth = { token };
  if (!chatSocket.connected) {
    chatSocket.connect();
  }

  return chatSocket;
}

export function getChatSocket(): Socket | null {
  return chatSocket;
}

export function disconnectChatSocket() {
  if (!chatSocket) {
    return;
  }

  chatSocket.disconnect();
}
