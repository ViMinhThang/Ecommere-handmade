import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatMessageType,
  CustomOrderStatus,
  PaymentStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { ChatService } from './chat.service';

describe('ChatService custom order quotes', () => {
  let service: ChatService;
  let prisma: { $transaction: jest.Mock };
  let tx: {
    chatConversation: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
    };
    product: {
      findFirst: jest.Mock;
    };
    customOrderQuoteTemplate: {
      findFirst: jest.Mock;
    };
    customOrder: {
      create: jest.Mock;
    };
    chatMessage: {
      create: jest.Mock;
    };
    chatConversationReadState: {
      upsert: jest.Mock;
    };
  };

  const createdAt = new Date('2026-05-17T08:00:00.000Z');
  const conversation = {
    id: 'conversation-1',
    customerId: 'customer-1',
    sellerId: 'seller-1',
  };
  const sender = {
    id: 'seller-1',
    name: 'Seller',
    avatar: null,
    shopName: 'Seller Shop',
  };

  beforeEach(() => {
    tx = {
      chatConversation: {
        findUnique: jest.fn().mockResolvedValue(conversation),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'seller-1',
          roles: ['ROLE_SELLER'],
          status: UserStatus.ACTIVE,
          deletedAt: null,
        }),
        findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      },
      product: {
        findFirst: jest.fn(),
      },
      customOrderQuoteTemplate: {
        findFirst: jest.fn(),
      },
      customOrder: {
        create: jest.fn().mockResolvedValue({ id: 'custom-order-1' }),
      },
      chatMessage: {
        create: jest.fn(async (args: Prisma.ChatMessageCreateArgs) => ({
          id: 'message-1',
          conversationId: args.data.conversationId,
          senderId: args.data.senderId,
          type: args.data.type,
          payload: args.data.payload,
          createdAt,
          sender,
        })),
      },
      chatConversationReadState: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };

    service = new ChatService(prisma as unknown as never);
  });

  it('lets the conversation seller create a custom order quote atomically', async () => {
    const result = await service.sendCustomOrderQuote(
      'seller-1',
      'conversation-1',
      {
        title: 'Handmade vase',
        description: 'Wheel-thrown stoneware',
        price: 150000,
        materials: ['stoneware', 'clear glaze'],
        sizeOptions: { height: '20cm' },
        leadTime: '10 days',
        message: 'Here is the quote',
      },
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.chatConversation.findUnique).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      select: {
        id: true,
        customerId: true,
        sellerId: true,
        contextProductId: true,
      },
    });
    expect(tx.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'customer-1',
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    expect(tx.customOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'customer-1',
        sellerId: 'seller-1',
        title: 'Handmade vase',
        artisanNote: 'Wheel-thrown stoneware',
        price: 150000,
        leadTime: '10 days',
        quoteTemplateId: undefined,
        quoteSentAt: expect.any(Date),
        status: CustomOrderStatus.PENDING_REVIEW,
        paymentStatus: PaymentStatus.UNPAID,
        quoteSnapshot: expect.objectContaining({
          version: 1,
          source: 'manual',
          templateId: null,
          templateName: null,
          title: 'Handmade vase',
          description: 'Wheel-thrown stoneware',
          price: 150000,
          currency: 'vnd',
          materials: ['stoneware', 'clear glaze'],
          sizeOptions: { height: '20cm' },
          estimatedLeadTime: '10 days',
        }),
      }),
      select: { id: true },
    });
    expect(tx.chatMessage.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conversation-1',
        senderId: 'seller-1',
        type: ChatMessageType.CUSTOM_ORDER_OFFER,
        payload: {
          text: 'Here is the quote',
          customOrderId: 'custom-order-1',
          quoteSnapshot: expect.objectContaining({
            title: 'Handmade vase',
            price: 150000,
          }),
        },
      },
      include: { sender: { select: expect.any(Object) } },
    });
    expect(tx.chatConversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: { updatedAt: createdAt },
    });
    expect(tx.chatConversationReadState.upsert).toHaveBeenCalledWith({
      where: {
        conversationId_userId: {
          conversationId: 'conversation-1',
          userId: 'seller-1',
        },
      },
      update: { lastReadAt: createdAt },
      create: {
        conversationId: 'conversation-1',
        userId: 'seller-1',
        lastReadAt: createdAt,
      },
    });
    expect(result.payload).toEqual({
      text: 'Here is the quote',
      customOrderId: 'custom-order-1',
      quoteSnapshot: expect.objectContaining({
        title: 'Handmade vase',
        price: 150000,
      }),
    });
  });

  it('uses an active seller-owned template as quote snapshot source', async () => {
    tx.customOrderQuoteTemplate.findFirst.mockResolvedValue({
      id: 'template-1',
      sellerId: 'seller-1',
      name: 'Vase template',
      title: 'Template vase',
      description: 'Template description',
      estimatedPrice: new Prisma.Decimal(100000),
      minPrice: new Prisma.Decimal(90000),
      maxPrice: new Prisma.Decimal(180000),
      materials: ['clay'],
      sizeOptions: ['small', 'large'],
      estimatedLeadTime: '14 days',
      revisionPolicy: 'One revision',
      shippingNote: 'Packed carefully',
      termsNote: 'Final sale',
    });

    await service.sendCustomOrderQuote('seller-1', 'conversation-1', {
      templateId: 'template-1',
      price: 120000,
    });

    expect(tx.customOrderQuoteTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'template-1',
        sellerId: 'seller-1',
        deletedAt: null,
        isActive: true,
      },
      select: expect.any(Object),
    });
    expect(tx.customOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Template vase',
          leadTime: '14 days',
          quoteTemplateId: 'template-1',
          quoteSnapshot: expect.objectContaining({
            source: 'template',
            templateId: 'template-1',
            templateName: 'Vase template',
            title: 'Template vase',
            price: 120000,
            priceRange: {
              minPrice: 90000,
              maxPrice: 180000,
            },
            materials: ['clay'],
            sizeOptions: ['small', 'large'],
            revisionPolicy: 'One revision',
            shippingNote: 'Packed carefully',
            termsNote: 'Final sale',
          }),
        }),
      }),
    );
  });

  it('rejects the customer participant from sending a quote', async () => {
    await expect(
      service.sendCustomOrderQuote('customer-1', 'conversation-1', {
        title: 'Bad quote',
        price: 100000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(tx.customOrder.create).not.toHaveBeenCalled();
    expect(tx.chatMessage.create).not.toHaveBeenCalled();
  });

  it('rejects a different seller from sending a quote into the conversation', async () => {
    await expect(
      service.sendCustomOrderQuote('seller-2', 'conversation-1', {
        title: 'Bad quote',
        price: 100000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(tx.customOrder.create).not.toHaveBeenCalled();
    expect(tx.chatMessage.create).not.toHaveBeenCalled();
  });

  it('rejects missing, foreign, deleted, or inactive templates through the scoped lookup', async () => {
    tx.customOrderQuoteTemplate.findFirst.mockResolvedValue(null);

    await expect(
      service.sendCustomOrderQuote('seller-1', 'conversation-1', {
        templateId: 'template-foreign-or-inactive',
        title: 'Fallback title',
        price: 100000,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.customOrderQuoteTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'template-foreign-or-inactive',
        sellerId: 'seller-1',
        deletedAt: null,
        isActive: true,
      },
      select: expect.any(Object),
    });
    expect(tx.customOrder.create).not.toHaveBeenCalled();
    expect(tx.chatMessage.create).not.toHaveBeenCalled();
  });

  it('rolls back the staged custom order if chat message creation fails', async () => {
    const committedOrders: Prisma.CustomOrderCreateArgs[] = [];
    prisma.$transaction.mockImplementation(async (callback) => {
      const stagedOrders: Prisma.CustomOrderCreateArgs[] = [];
      tx.customOrder.create.mockImplementation(async (args) => {
        stagedOrders.push(args);
        return { id: 'custom-order-1' };
      });
      tx.chatMessage.create.mockRejectedValue(new Error('chat write failed'));

      try {
        const result = await callback(tx);
        committedOrders.push(...stagedOrders);
        return result;
      } catch (error) {
        return Promise.reject(error);
      }
    });

    await expect(
      service.sendCustomOrderQuote('seller-1', 'conversation-1', {
        title: 'Rollback quote',
        price: 100000,
      }),
    ).rejects.toThrow('chat write failed');

    expect(tx.customOrder.create).toHaveBeenCalledTimes(1);
    expect(tx.chatMessage.create).toHaveBeenCalledTimes(1);
    expect(committedOrders).toEqual([]);
    expect(tx.chatConversation.update).not.toHaveBeenCalled();
  });

  it('rejects invalid structured quote fields before creating records', async () => {
    await expect(
      service.sendCustomOrderQuote('seller-1', 'conversation-1', {
        title: 'Invalid materials',
        price: 100000,
        materials: 'clay',
      }),
    ).rejects.toThrow('materials must be an array or object');

    expect(tx.customOrder.create).not.toHaveBeenCalled();
    expect(tx.chatMessage.create).not.toHaveBeenCalled();
  });
});

describe('ChatService conversation target validation', () => {
  let service: ChatService;
  let prisma: {
    user: { findUnique: jest.Mock };
    product: { findFirst: jest.Mock };
    chatConversation: { findUnique: jest.Mock };
    chatMessage: { create: jest.Mock; count: jest.Mock };
    chatConversationReadState: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'seller-1',
          roles: ['ROLE_SELLER'],
          status: UserStatus.ACTIVE,
          deletedAt: null,
        }),
      },
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'product-1' }),
      },
      chatConversation: {
        findUnique: jest.fn(),
      },
      chatMessage: {
        create: jest.fn(),
        count: jest.fn(),
      },
      chatConversationReadState: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new ChatService(prisma as unknown as never);
  });

  it('rejects starting a conversation with an inactive seller', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'seller-1',
      roles: ['ROLE_SELLER'],
      status: UserStatus.INACTIVE,
      deletedAt: null,
    });

    await expect(
      service.startConversation('customer-1', { sellerId: 'seller-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.chatConversation.findUnique).not.toHaveBeenCalled();
  });

  it('rejects starting a product chat when the product is not public', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.startConversation('customer-1', {
        sellerId: 'seller-1',
        productId: 'pending-product',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'pending-product',
        sellerId: 'seller-1',
        deletedAt: null,
        status: 'APPROVED',
        category: {
          deletedAt: null,
          status: 'ACTIVE',
        },
      },
      select: { id: true },
    });
  });

  it('rejects sending messages if the conversation seller is inactive', async () => {
    prisma.chatConversation.findUnique.mockResolvedValue({
      id: 'conversation-1',
      customerId: 'customer-1',
      sellerId: 'seller-1',
      contextProductId: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'seller-1',
      roles: ['ROLE_SELLER'],
      status: UserStatus.SUSPENDED,
      deletedAt: null,
    });

    await expect(
      service.sendTextMessage('customer-1', 'conversation-1', {
        text: 'Hello',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('marks a conversation read only when there are unread incoming messages', async () => {
    const incomingAt = new Date('2026-05-18T07:20:00.000Z');
    const previousReadAt = new Date('2026-05-18T07:10:00.000Z');
    prisma.chatConversation.findUnique.mockResolvedValue({
      id: 'conversation-1',
      customerId: 'customer-1',
      sellerId: 'seller-1',
      messages: [{ createdAt: incomingAt }],
      readStates: [{ lastReadAt: previousReadAt }],
    });
    prisma.chatConversationReadState.upsert.mockResolvedValue({
      lastReadAt: incomingAt,
    });

    const result = await service.markConversationRead(
      'customer-1',
      'conversation-1',
    );

    expect(prisma.chatConversationReadState.upsert).toHaveBeenCalledWith({
      where: {
        conversationId_userId: {
          conversationId: 'conversation-1',
          userId: 'customer-1',
        },
      },
      update: { lastReadAt: incomingAt },
      create: {
        conversationId: 'conversation-1',
        userId: 'customer-1',
        lastReadAt: incomingAt,
      },
    });
    expect(result).toEqual({
      conversationId: 'conversation-1',
      lastReadAt: incomingAt,
      changed: true,
    });
  });

  it('does not rewrite read state when the conversation is already read', async () => {
    const incomingAt = new Date('2026-05-18T07:20:00.000Z');
    const currentReadAt = new Date('2026-05-18T07:25:00.000Z');
    prisma.chatConversation.findUnique.mockResolvedValue({
      id: 'conversation-1',
      customerId: 'customer-1',
      sellerId: 'seller-1',
      messages: [{ createdAt: incomingAt }],
      readStates: [{ lastReadAt: currentReadAt }],
    });

    const result = await service.markConversationRead(
      'customer-1',
      'conversation-1',
    );

    expect(prisma.chatConversationReadState.upsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      conversationId: 'conversation-1',
      lastReadAt: currentReadAt,
      changed: false,
    });
  });

  it('does not create read-state churn when there are no incoming messages', async () => {
    prisma.chatConversation.findUnique.mockResolvedValue({
      id: 'conversation-1',
      customerId: 'customer-1',
      sellerId: 'seller-1',
      messages: [],
      readStates: [],
    });

    const result = await service.markConversationRead(
      'customer-1',
      'conversation-1',
    );

    expect(prisma.chatConversationReadState.upsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      conversationId: 'conversation-1',
      lastReadAt: null,
      changed: false,
    });
  });
});
