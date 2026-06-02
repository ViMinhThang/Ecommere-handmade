import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { UsersService } from '../users/users.service';
import { Notification } from '@prisma/client';
import {
  describeErrorForObservability,
  emitObservabilityEvent,
  extractRequestIdFromHeaders,
} from '../common/observability/observability.util';

interface JwtPayload {
  sub: string;
}

interface SocketData {
  userId: string;
}

type NotificationsSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) { }

  async handleConnection(client: NotificationsSocket): Promise<void> {
    const requestId = extractRequestIdFromHeaders(
      client.handshake.headers as Record<string, unknown>,
    );
    const token = this.extractAccessToken(client);
    if (!token) {
      emitObservabilityEvent(this.logger, 'warn', 'notifications_socket_auth_failed', {
        requestId,
        socketId: client.id,
        reason: 'missing_access_token',
      });
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      const user = await this.usersService.findOne(payload.sub);
      client.data.userId = user.id;
      await client.join(this.getUserRoom(user.id));
    } catch (error) {
      emitObservabilityEvent(this.logger, 'warn', 'notifications_socket_auth_failed', {
        requestId,
        socketId: client.id,
        reason: 'token_verification_failed',
        ...describeErrorForObservability(error),
      });
      client.disconnect();
    }
  }

  emitNotification(userId: string, notification: Notification): void {
    this.server
      .to(this.getUserRoom(userId))
      .emit('notifications.created', notification);
  }

  emitOrderUpdated(customerId: string, sellerId: string, payload: any): void {
    this.server
      .to(this.getUserRoom(customerId))
      .emit('order.updated', payload);
    this.server
      .to(this.getUserRoom(sellerId))
      .emit('order.updated', payload);
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private extractAccessToken(client: NotificationsSocket): string | null {
    const authToken = this.getHandshakeAuthToken(client.handshake.auth);
    if (authToken) {
      return authToken;
    }

    const authorizationHeader = client.handshake.headers.authorization;
    if (
      typeof authorizationHeader === 'string' &&
      authorizationHeader.toLowerCase().startsWith('bearer ')
    ) {
      return authorizationHeader.slice(7).trim();
    }

    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    const cookieEntries = cookieHeader.split(';');
    for (const cookieEntry of cookieEntries) {
      const [rawName, ...rawValueParts] = cookieEntry.trim().split('=');
      if (rawName !== 'auth_access_token') {
        continue;
      }

      const value = rawValueParts.join('=');
      return value ? decodeURIComponent(value) : null;
    }

    return null;
  }

  private getHandshakeAuthToken(auth: unknown): string | null {
    if (!auth || typeof auth !== 'object' || !('token' in auth)) {
      return null;
    }

    const token = (auth as { token?: unknown }).token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  }
}
