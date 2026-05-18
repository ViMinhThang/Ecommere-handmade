import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryStatus,
  ChatMessageType,
  CustomOrderStatus,
  PaymentStatus,
  Prisma,
  ProductStatus,
  UserStatus,
} from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CursorQueryDto } from './dto/cursor-query.dto';
import { SendCustomOrderQuoteDto } from './dto/send-custom-order-quote.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import {
  createImageFileName,
  validateImageFile,
} from '../common/utils/image-upload';

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

const QUOTE_TEMPLATE_SELECT = {
  id: true,
  sellerId: true,
  name: true,
  title: true,
  description: true,
  estimatedPrice: true,
  minPrice: true,
  maxPrice: true,
  materials: true,
  sizeOptions: true,
  estimatedLeadTime: true,
  revisionPolicy: true,
  shippingNote: true,
  termsNote: true,
} as const;

const QUOTE_CURRENCY = 'vnd';
const MAX_STRUCTURED_JSON_LENGTH = 10_000;

type ChatUserSummary = Prisma.UserGetPayload<{
  select: typeof CHAT_USER_SELECT;
}>;
type ChatProductSummary = Prisma.ProductGetPayload<{
  select: typeof CHAT_PRODUCT_SELECT;
}>;
type CustomOrderQuoteTemplateForSend =
  Prisma.CustomOrderQuoteTemplateGetPayload<{
    select: typeof QUOTE_TEMPLATE_SELECT;
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

interface NormalizedCustomOrderQuote {
  title: string;
  description: string;
  price: number;
  leadTime: string | null;
  specifications: string[];
  snapshot: Prisma.InputJsonObject;
  messageText: string;
}

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

export interface ChatReadStateDto {
  conversationId: string;
  lastReadAt: Date | null;
  changed: boolean;
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
    await this.assertConversationCanReceiveMessage(conversation);

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
    await this.assertConversationCanReceiveMessage(conversation);

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

  async sendCustomOrderQuote(
    currentUserId: string,
    conversationId: string,
    dto: SendCustomOrderQuoteDto,
  ): Promise<ChatMessageDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.chatConversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          customerId: true,
          sellerId: true,
          contextProductId: true,
        },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      if (conversation.sellerId !== currentUserId) {
        throw new ForbiddenException(
          'Only the seller can send custom order quotes',
        );
      }

      await this.assertConversationCanReceiveMessage(conversation, tx);

      const customer = await tx.user.findFirst({
        where: {
          id: conversation.customerId,
          deletedAt: null,
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const template = dto.templateId
        ? await tx.customOrderQuoteTemplate.findFirst({
            where: {
              id: dto.templateId,
              sellerId: currentUserId,
              deletedAt: null,
              isActive: true,
            },
            select: QUOTE_TEMPLATE_SELECT,
          })
        : null;

      if (dto.templateId && !template) {
        throw new NotFoundException('Quote template not found');
      }

      const now = new Date();
      const quote = this.buildQuoteSnapshot(dto, template, now);

      const customOrder = await tx.customOrder.create({
        data: {
          customerId: conversation.customerId,
          sellerId: currentUserId,
          title: quote.title,
          artisanNote: quote.description || null,
          price: quote.price,
          leadTime: quote.leadTime,
          specifications: quote.specifications as Prisma.InputJsonValue,
          quoteTemplateId: template?.id,
          quoteSnapshot: quote.snapshot,
          quoteSentAt: now,
          status: CustomOrderStatus.PENDING_REVIEW,
          paymentStatus: PaymentStatus.UNPAID,
        },
        select: { id: true },
      });

      const created = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: currentUserId,
          type: ChatMessageType.CUSTOM_ORDER_OFFER,
          payload: {
            text: quote.messageText,
            customOrderId: customOrder.id,
            quoteSnapshot: quote.snapshot,
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

  async markConversationRead(
    currentUserId: string,
    conversationId: string,
  ): Promise<ChatReadStateDto> {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        customerId: true,
        sellerId: true,
        messages: {
          where: {
            senderId: {
              not: currentUserId,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        readStates: {
          where: { userId: currentUserId },
          select: { lastReadAt: true },
          take: 1,
        },
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

    const latestIncomingMessageAt = conversation.messages[0]?.createdAt ?? null;
    const currentLastReadAt = conversation.readStates[0]?.lastReadAt ?? null;

    if (
      !latestIncomingMessageAt ||
      (currentLastReadAt &&
        currentLastReadAt.getTime() >= latestIncomingMessageAt.getTime())
    ) {
      return {
        conversationId,
        lastReadAt: currentLastReadAt,
        changed: false,
      };
    }

    const readState = await this.prisma.chatConversationReadState.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      update: {
        lastReadAt: latestIncomingMessageAt,
      },
      create: {
        conversationId,
        userId: currentUserId,
        lastReadAt: latestIncomingMessageAt,
      },
    });

    return {
      conversationId,
      lastReadAt: readState.lastReadAt,
      changed: true,
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
        contextProductId: true,
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

  private buildQuoteSnapshot(
    dto: SendCustomOrderQuoteDto,
    template: CustomOrderQuoteTemplateForSend | null,
    sentAt: Date,
  ): NormalizedCustomOrderQuote {
    if (!Number.isFinite(dto.price) || dto.price <= 0) {
      throw new BadRequestException('Quote price must be greater than 0');
    }

    const title = this.trimOptional(dto.title) ?? template?.title.trim();
    if (!title) {
      throw new BadRequestException('Quote title is required');
    }

    const minPrice = this.decimalToNumber(template?.minPrice ?? null);
    const maxPrice = this.decimalToNumber(template?.maxPrice ?? null);
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      throw new BadRequestException(
        'Template minimum price cannot exceed maximum price',
      );
    }

    const description =
      this.trimOptional(dto.description) ?? template?.description.trim() ?? '';
    const leadTime =
      this.trimOptional(dto.leadTime) ??
      this.trimOptional(template?.estimatedLeadTime) ??
      null;
    const revisionPolicy =
      this.trimOptional(dto.revisionPolicy) ??
      this.trimOptional(template?.revisionPolicy) ??
      null;
    const shippingNote =
      this.trimOptional(dto.shippingNote) ??
      this.trimOptional(template?.shippingNote) ??
      null;
    const termsNote =
      this.trimOptional(dto.termsNote) ??
      this.trimOptional(template?.termsNote) ??
      null;
    const materials = this.normalizeStructuredValue(
      dto.materials !== undefined ? dto.materials : template?.materials,
      'materials',
    );
    const sizeOptions = this.normalizeStructuredValue(
      dto.sizeOptions !== undefined ? dto.sizeOptions : template?.sizeOptions,
      'sizeOptions',
    );

    const snapshot: Prisma.InputJsonObject = {
      version: 1,
      source: template ? 'template' : 'manual',
      templateId: template?.id ?? null,
      templateName: template?.name ?? null,
      title,
      description,
      price: dto.price,
      currency: QUOTE_CURRENCY,
      priceRange: {
        minPrice,
        maxPrice,
      },
      materials,
      sizeOptions,
      estimatedLeadTime: leadTime,
      revisionPolicy,
      shippingNote,
      termsNote,
      sentAt: sentAt.toISOString(),
    };

    return {
      title,
      description,
      price: dto.price,
      leadTime,
      specifications: this.buildQuoteSpecifications({
        materials,
        sizeOptions,
        revisionPolicy,
        shippingNote,
        termsNote,
      }),
      snapshot,
      messageText:
        this.trimOptional(dto.message) ??
        `Custom order quote: ${title} - ${dto.price} ${QUOTE_CURRENCY}`,
    };
  }

  private buildQuoteSpecifications(data: {
    materials: Prisma.InputJsonValue;
    sizeOptions: Prisma.InputJsonValue;
    revisionPolicy: string | null;
    shippingNote: string | null;
    termsNote: string | null;
  }): string[] {
    return [
      this.formatStructuredSpecification('Materials', data.materials),
      this.formatStructuredSpecification('Options', data.sizeOptions),
      data.revisionPolicy ? `Revision policy: ${data.revisionPolicy}` : null,
      data.shippingNote ? `Shipping note: ${data.shippingNote}` : null,
      data.termsNote ? `Terms: ${data.termsNote}` : null,
    ].filter((value): value is string => Boolean(value));
  }

  private formatStructuredSpecification(
    label: string,
    value: Prisma.InputJsonValue,
  ): string | null {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return null;
      }

      const joined = value
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .join(', ');
      return `${label}: ${joined}`;
    }

    if (this.isPlainObject(value) && Object.keys(value).length > 0) {
      return `${label}: ${JSON.stringify(value)}`;
    }

    return null;
  }

  private normalizeStructuredValue(
    value: unknown,
    fieldName: string,
  ): Prisma.InputJsonValue {
    if (value === undefined || value === null) {
      return [];
    }

    if (!Array.isArray(value) && !this.isPlainObject(value)) {
      throw new BadRequestException(`${fieldName} must be an array or object`);
    }

    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > MAX_STRUCTURED_JSON_LENGTH) {
      throw new BadRequestException(`${fieldName} is too large`);
    }

    return value as Prisma.InputJsonValue;
  }

  private trimOptional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private decimalToNumber(value: Prisma.Decimal | null) {
    return value === null ? null : Number(value);
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

  private async validateSeller(
    sellerId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const seller = await tx.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        roles: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!seller || seller.deletedAt || seller.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Seller not found');
    }

    if (!seller.roles.includes('ROLE_SELLER')) {
      throw new BadRequestException('Target user is not a seller');
    }
  }

  private async validateProductContext(
    productId: string,
    sellerId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        sellerId,
        deletedAt: null,
        status: ProductStatus.APPROVED,
        category: {
          deletedAt: null,
          status: CategoryStatus.ACTIVE,
        },
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

  private async assertConversationCanReceiveMessage(
    conversation: { sellerId: string; contextProductId?: string | null },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    await this.validateSeller(conversation.sellerId, tx);

    if (conversation.contextProductId) {
      await this.validateProductContext(
        conversation.contextProductId,
        conversation.sellerId,
        tx,
      );
    }
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
    validateImageFile(file);
    const fileName = createImageFileName(file);
    const relativePath = path.posix.join('chat', conversationId, fileName);
    const absolutePath = path.join('uploads', ...relativePath.split('/'));

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    return relativePath;
  }
}
