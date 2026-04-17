import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatMessageDto, ChatService } from './chat.service';
import { UsersService } from '../users/users.service';

interface JwtPayload {
  sub: string;
}

interface JoinConversationPayload {
  conversationId: string;
}

interface SocketData {
  userId: string;
}

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(
    client: Socket<any, any, any, SocketData>,
  ): Promise<void> {
    const token = this.extractAccessToken(client);
    if (!token) {
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
      this.logger.warn(
        `Socket authentication failed: ${(error as Error).message}`,
      );
      client.disconnect();
    }
  }

  @SubscribeMessage('chat.conversation.join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinConversationPayload,
  ) {
    const userId = this.getClientUserId(client);

    if (!body?.conversationId) {
      throw new WsException('conversationId is required');
    }

    await this.chatService.getConversationForParticipant(
      body.conversationId,
      userId,
    );
    await client.join(this.getConversationRoom(body.conversationId));

    return {
      ok: true,
      conversationId: body.conversationId,
    };
  }

  emitMessageCreated(conversationId: string, message: ChatMessageDto): void {
    this.server
      .to(this.getConversationRoom(conversationId))
      .emit('chat.message.created', message);
  }

  async emitConversationUpdated(conversationId: string): Promise<void> {
    const participantIds =
      await this.chatService.getConversationParticipantIds(conversationId);

    await Promise.all(
      participantIds.map(async (userId) => {
        const summary = await this.chatService.getConversationSummaryForUser(
          conversationId,
          userId,
        );
        const unread = await this.chatService.getUnreadCount(userId);

        this.server
          .to(this.getUserRoom(userId))
          .emit('chat.conversation.updated', summary);
        this.server
          .to(this.getUserRoom(userId))
          .emit('chat.unread.updated', unread);
      }),
    );
  }

  private getClientUserId(client: Socket): string {
    const userId = (client as Socket<any, any, any, SocketData>).data.userId;
    if (!userId || typeof userId !== 'string') {
      throw new WsException('Unauthorized');
    }
    return userId;
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private getConversationRoom(conversationId: string) {
    return `conversation:${conversationId}`;
  }

  private extractAccessToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
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
}
