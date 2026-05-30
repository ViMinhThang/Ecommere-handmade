import { io, Socket } from 'socket.io-client';

let notificationsSocket: Socket | null = null;

function getSocketBaseUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return baseUrl.replace(/\/+$/, '').replace(/\/v\d+$/i, '');
}

export function ensureNotificationsSocketConnected(): Socket | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!notificationsSocket) {
        notificationsSocket = io(`${getSocketBaseUrl()}/notifications`, {
            withCredentials: true,
            autoConnect: false,
            transports: ['websocket'],
        });
    }

    if (!notificationsSocket.connected) {
        notificationsSocket.connect();
    }

    return notificationsSocket;
}

export function getNotificationsSocket(): Socket | null {
    return notificationsSocket;
}

export function disconnectNotificationsSocket() {
    if (!notificationsSocket) {
        return;
    }

    notificationsSocket.disconnect();
}
