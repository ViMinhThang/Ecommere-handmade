import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  ChatMessageType,
  CustomOrderStatus,
  PaymentStatus,
  Prisma,
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
        findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }),
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
      select: { id: true, customerId: true, sellerId: true },
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
