import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatMessageType, Prisma } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CursorQueryDto } from './dto/cursor-query.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { SendCustomOrderOfferDto } from './dto/send-custom-order-offer.dto';
import { StartConversationDto } from './dto/start-conversation.dto';

const CHAT_USER_SELECT = {
  id: true,
  name: true,
  avatar: true,
  shopName: true,
} as const;

const CHAT_PRODUCT_SELECT = {
  id: true,
  name: true,
} as const;

type ChatUserSummary = Prisma.UserGetPayload<{
  select: typeof CHAT_USER_SELECT;
}>;
type ChatProductSummary = Prisma.ProductGetPayload<{
  select: typeof CHAT_PRODUCT_SELECT;
}>;
type ChatMessageWithSender = Prisma.ChatMessageGetPayload<{
  include: {
    sender: {
      select: typeof CHAT_USER_SELECT;
    };
  };
}>;
type ChatConversationForList = Prisma.ChatConversationGetPayload<{
  include: {
    customer: {
      select: typeof CHAT_USER_SELECT;
    };
    seller: {
      select: typeof CHAT_USER_SELECT;
    };
    contextProduct: {
      select: typeof CHAT_PRODUCT_SELECT;
    };
    messages: {
      include: {
        sender: {
          select: typeof CHAT_USER_SELECT;
        };
      };
    };
    readStates: {
      select: {
        lastReadAt: true;
      };
    };
  };
}>;

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  type: ChatMessageType;
  payload: Record<string, unknown>;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
    shopName: string | null;
  };
}

export interface ChatParticipantDto {
  id: string;
  name: string;
  avatar: string | null;
  shopName: string | null;
}

export interface ChatConversationSummaryDto {
  id: string;
  customerId: string;
  sellerId: string;
  contextProduct: {
    id: string;
    name: string;
  } | null;
  otherParticipant: ChatParticipantDto;
  lastMessage: ChatMessageDto | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CursorListResponse<T> {
  data: T[];
  nextCursor: string | null;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async startConversation(
    currentUserId: string,
    dto: StartConversationDto,
  ): Promise<ChatConversationSummaryDto> {
    if (currentUserId === dto.sellerId) {
      throw new BadRequestException('You cannot start a chat with yourself');
    }

    await this.validateSeller(dto.sellerId);
    let contextProductId: string | null = null;
    if (dto.productId) {
      contextProductId = await this.validateProductContext(
        dto.productId,
        dto.sellerId,
      );
    }

    const existingConversation = await this.prisma.chatConversation.findUnique({
      where: {
        customerId_sellerId: {
          customerId: currentUserId,
          sellerId: dto.sellerId,
        },
      },
      select: { id: true },
    });

    if (existingConversation) {
      await this.prisma.chatConversation.update({
        where: { id: existingConversation.id },
        data: {
          ...(contextProductId ? { contextProductId } : {}),
          updatedAt: new Date(),
        },
      });

      await Promise.all([
        this.ensureReadState(existingConversation.id, currentUserId),
        this.ensureReadState(existingConversation.id, dto.sellerId),
      ]);

      return this.getConversationSummaryForUser(
        existingConversation.id,
        currentUserId,
      );
    }

    const created = await this.prisma.chatConversation.create({
      data: {
        customerId: currentUserId,
        sellerId: dto.sellerId,
        contextProductId,
        readStates: {
          create: [{ userId: currentUserId }, { userId: dto.sellerId }],
        },
      },
      select: { id: true },
    });

    return this.getConversationSummaryForUser(created.id, currentUserId);
  }

  async listConversations(
    currentUserId: string,
    query: CursorQueryDto,
  ): Promise<CursorListResponse<ChatConversationSummaryDto>> {
    const limit = this.normalizeLimit(query.limit);
    const cursorDate = this.parseCursor(query.cursor);
    const include = this.getConversationInclude(currentUserId);

    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        OR: [{ customerId: currentUserId }, { sellerId: currentUserId }],
        ...(cursorDate ? { updatedAt: { lt: cursorDate } } : {}),
      },
      include,
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = conversations.length > limit;
    const pageItems = hasMore ? conversations.slice(0, limit) : conversations;

    const data = await Promise.all(
      pageItems.map((conversation) =>
        this.mapConversationSummary(conversation, currentUserId),
      ),
    );

    const nextCursor = hasMore
      ? (pageItems[pageItems.length - 1]?.updatedAt.toISOString() ?? null)
      : null;

    return { data, nextCursor };
  }

  async getMessages(
    currentUserId: string,
    conversationId: string,
    query: CursorQueryDto,
  ): Promise<CursorListResponse<ChatMessageDto>> {
    await this.getConversationForParticipant(conversationId, currentUserId);

    const limit = this.normalizeLimit(query.limit);
    const cursorDate = this.parseCursor(query.cursor);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      include: {
        sender: {
          select: CHAT_USER_SELECT,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const pageItems = hasMore ? messages.slice(0, limit) : messages;

    const nextCursor = hasMore
      ? (pageItems[pageItems.length - 1]?.createdAt.toISOString() ?? null)
      : null;

    return {
      data: pageItems.reverse().map((message) => this.mapMessage(message)),
      nextCursor,
    };
  }

  async sendTextMessage(
    currentUserId: string,
    conversationId: string,
    dto: SendTextMessageDto,
  ): Promise<ChatMessageDto> {
    const conversation = await this.getConversationForParticipant(
      conversationId,
      currentUserId,
    );
    const text = dto.text.trim();
    if (!text) {
      throw new BadRequestException('Message text is required');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: currentUserId,
          type: ChatMessageType.TEXT,
          payload: { text },
        },
        include: {
          sender: {
            select: CHAT_USER_SELECT,
          },
        },
      });

      await tx.chatConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: created.createdAt },
      });

      await tx.chatConversationReadState.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: currentUserId,
          },
        },
        update: {
          lastReadAt: created.createdAt,
        },
        create: {
          conversationId: conversation.id,
          userId: currentUserId,
          lastReadAt: created.createdAt,
        },
      });

      return created;
    });

    return this.mapMessage(result);
  }

  async sendCustomOrderOffer(
    currentUserId: string,
    conversationId: string,
    dto: SendCustomOrderOfferDto,
  ): Promise<ChatMessageDto> {
    const conversation = await this.getConversationForParticipant(
      conversationId,
      currentUserId,
    );

    // Verify custom order exists and belongs to this seller-customer pair
    const customOrder = await this.prisma.customOrder.findUnique({
      where: { id: dto.customOrderId },
    });

    if (!customOrder) {
      throw new NotFoundException('Custom order not found');
    }

    if (
      customOrder.sellerId !== conversation.sellerId ||
      customOrder.customerId !== conversation.customerId
    ) {
      throw new BadRequestException(
        'Custom order does not match this conversation participants',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: currentUserId,
          type: ChatMessageType.CUSTOM_ORDER_OFFER,
          payload: {
            text: dto.message,
            customOrderId: dto.customOrderId,
            price: Number(customOrder.price),
            title: customOrder.title,
          },
        },
        include: {
          sender: {
            select: CHAT_USER_SELECT,
          },
        },
      });

      await tx.chatConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: created.createdAt },
      });

      await tx.chatConversationReadState.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: currentUserId,
          },
        },
        update: {
          lastReadAt: created.createdAt,
        },
        create: {
          conversationId: conversation.id,
          userId: currentUserId,
          lastReadAt: created.createdAt,
        },
      });

      return created;
    });

    return this.mapMessage(result);
  }

  async sendImageMessage(
    currentUserId: string,
    conversationId: string,
    file: Express.Multer.File,
    caption?: string,
  ): Promise<ChatMessageDto> {
    const conversation = await this.getConversationForParticipant(
      conversationId,
      currentUserId,
    );

    const trimmedCaption = caption?.trim();
    const filePath = await this.persistImageFile(conversation.id, file);

    const payload: Prisma.InputJsonObject = trimmedCaption
      ? { imagePath: filePath, caption: trimmedCaption }
      : { imagePath: filePath };

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: currentUserId,
          type: ChatMessageType.IMAGE,
          payload,
        },
        include: {
          sender: {
            select: CHAT_USER_SELECT,
          },
        },
      });

      await tx.chatConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: created.createdAt },
      });

      await tx.chatConversationReadState.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: currentUserId,
          },
        },
        update: {
          lastReadAt: created.createdAt,
        },
        create: {
          conversationId: conversation.id,
          userId: currentUserId,
          lastReadAt: created.createdAt,
        },
      });

      return created;
    });

    return this.mapMessage(result as ChatMessageWithSender);
  }

  async markConversationRead(currentUserId: string, conversationId: string) {
    await this.getConversationForParticipant(conversationId, currentUserId);
    const now = new Date();

    const readState = await this.prisma.chatConversationReadState.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      update: {
        lastReadAt: now,
      },
      create: {
        conversationId,
        userId: currentUserId,
        lastReadAt: now,
      },
    });

    return {
      conversationId,
      lastReadAt: readState.lastReadAt,
    };
  }

  async getUnreadCount(
    currentUserId: string,
  ): Promise<{ unreadCount: number }> {
    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        OR: [{ customerId: currentUserId }, { sellerId: currentUserId }],
      },
      select: {
        id: true,
      },
    });

    if (conversations.length === 0) {
      return { unreadCount: 0 };
    }

    const conversationIds = conversations.map(
      (conversation) => conversation.id,
    );
    const readStates = await this.prisma.chatConversationReadState.findMany({
      where: {
        userId: currentUserId,
        conversationId: {
          in: conversationIds,
        },
      },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    const readStateMap = new Map<string, Date | null>();
    for (const readState of readStates) {
      readStateMap.set(readState.conversationId, readState.lastReadAt);
    }

    const unreadCounts = await Promise.all(
      conversationIds.map((conversationId) =>
        this.countUnreadMessages(
          conversationId,
          currentUserId,
          readStateMap.get(conversationId) ?? null,
        ),
      ),
    );

    return {
      unreadCount: unreadCounts.reduce((sum, count) => sum + count, 0),
    };
  }

  async getConversationSummaryForUser(
    conversationId: string,
    currentUserId: string,
  ): Promise<ChatConversationSummaryDto> {
    const include = this.getConversationInclude(currentUserId);
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.customerId !== currentUserId &&
      conversation.sellerId !== currentUserId
    ) {
      throw new ForbiddenException('You cannot access this conversation');
    }

    return this.mapConversationSummary(conversation, currentUserId);
  }

  async getConversationForParticipant(
    conversationId: string,
    currentUserId: string,
  ) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        customerId: true,
        sellerId: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.customerId !== currentUserId &&
      conversation.sellerId !== currentUserId
    ) {
      throw new ForbiddenException('You cannot access this conversation');
    }

    return conversation;
  }

  async getConversationParticipantIds(
    conversationId: string,
  ): Promise<string[]> {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        customerId: true,
        sellerId: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return [conversation.customerId, conversation.sellerId];
  }

  private getConversationInclude(currentUserId: string) {
    return {
      customer: {
        select: CHAT_USER_SELECT,
      },
      seller: {
        select: CHAT_USER_SELECT,
      },
      contextProduct: {
        select: CHAT_PRODUCT_SELECT,
      },
      messages: {
        orderBy: {
          createdAt: 'desc' as const,
        },
        take: 1,
        include: {
          sender: {
            select: CHAT_USER_SELECT,
          },
        },
      },
      readStates: {
        where: {
          userId: currentUserId,
        },
        take: 1,
        select: {
          lastReadAt: true,
        },
      },
    };
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) {
      return 20;
    }
    return Math.min(Math.max(limit, 1), 50);
  }

  private parseCursor(cursor?: string): Date | null {
    if (!cursor) {
      return null;
    }

    const parsed = new Date(cursor);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid cursor value');
    }
    return parsed;
  }

  private async validateSeller(sellerId: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        roles: true,
        deletedAt: true,
      },
    });

    if (!seller || seller.deletedAt) {
      throw new NotFoundException('Seller not found');
    }

    if (!seller.roles.includes('ROLE_SELLER')) {
      throw new BadRequestException('Target user is not a seller');
    }
  }

  private async validateProductContext(productId: string, sellerId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new BadRequestException(
        'Product context does not belong to this seller',
      );
    }

    return product.id;
  }

  private async ensureReadState(conversationId: string, userId: string) {
    await this.prisma.chatConversationReadState.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      update: {},
      create: {
        conversationId,
        userId,
      },
    });
  }

  private async mapConversationSummary(
    conversation: ChatConversationForList,
    currentUserId: string,
  ): Promise<ChatConversationSummaryDto> {
    const readState = conversation.readStates[0] ?? null;
    const unreadCount = await this.countUnreadMessages(
      conversation.id,
      currentUserId,
      readState?.lastReadAt ?? null,
    );

    const otherParticipant: ChatUserSummary =
      conversation.customerId === currentUserId
        ? conversation.seller
        : conversation.customer;

    const lastMessage = conversation.messages[0]
      ? this.mapMessage(conversation.messages[0] as ChatMessageWithSender)
      : null;

    return {
      id: conversation.id,
      customerId: conversation.customerId,
      sellerId: conversation.sellerId,
      contextProduct: conversation.contextProduct
        ? this.mapProduct(conversation.contextProduct)
        : null,
      otherParticipant: this.mapParticipant(otherParticipant),
      lastMessage,
      unreadCount,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  private mapMessage(message: ChatMessageWithSender): ChatMessageDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      payload: this.normalizePayload(message.payload),
      createdAt: message.createdAt,
      sender: this.mapParticipant(message.sender),
    };
  }

  private mapParticipant(user: ChatUserSummary): ChatParticipantDto {
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      shopName: user.shopName,
    };
  }

  private mapProduct(product: ChatProductSummary) {
    return {
      id: product.id,
      name: product.name,
    };
  }

  private normalizePayload(value: Prisma.JsonValue): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private async countUnreadMessages(
    conversationId: string,
    currentUserId: string,
    lastReadAt: Date | null,
  ) {
    const where: Prisma.ChatMessageWhereInput = {
      conversationId,
      senderId: {
        not: currentUserId,
      },
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    };

    return this.prisma.chatMessage.count({ where });
  }

  private async persistImageFile(
    conversationId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${safeName}`;
    const relativePath = path.posix.join('chat', conversationId, fileName);
    const absolutePath = path.join('uploads', ...relativePath.split('/'));

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    return relativePath;
  }
}
