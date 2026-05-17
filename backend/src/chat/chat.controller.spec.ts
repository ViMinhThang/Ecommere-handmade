import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ROLES_KEY, RolesGuard } from '../auth/guards/roles.guard';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

describe('ChatController', () => {
  let controller: ChatController;

  const mockChatService = {
    startConversation: jest.fn(),
    listConversations: jest.fn(),
    getConversationSummaryForUser: jest.fn(),
    getMessages: jest.fn(),
    sendTextMessage: jest.fn(),
    sendImageMessage: jest.fn(),
    sendCustomOrderQuote: jest.fn(),
    markConversationRead: jest.fn(),
    getUnreadCount: jest.fn(),
  };

  const mockChatGateway = {
    emitConversationUpdated: jest.fn(),
    emitMessageCreated: jest.fn(),
  };

  const createRequest = (userId: string): AuthenticatedRequest =>
    ({
      user: {
        id: userId,
        email: `${userId}@example.com`,
        roles: ['ROLE_USER'],
      },
    }) as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('should start conversation through canonical endpoint method', async () => {
    const request = createRequest('customer-1');
    const dto = { sellerId: 'seller-1', productId: 'product-1' };
    const conversation = { id: 'conv-1' };
    mockChatService.startConversation.mockResolvedValue(conversation);
    mockChatGateway.emitConversationUpdated.mockResolvedValue(undefined);

    const result = await controller.startConversation(request, dto);

    expect(mockChatService.startConversation).toHaveBeenCalledWith(
      'customer-1',
      dto,
    );
    expect(mockChatGateway.emitConversationUpdated).toHaveBeenCalledWith(
      'conv-1',
    );
    expect(result).toEqual(conversation);
  });

  it('should keep alias endpoint behavior consistent', async () => {
    const request = createRequest('customer-2');
    const dto = { sellerId: 'seller-2' };
    const conversation = { id: 'conv-2' };
    mockChatService.startConversation.mockResolvedValue(conversation);
    mockChatGateway.emitConversationUpdated.mockResolvedValue(undefined);

    const result = await controller.startConversationAlias(request, dto);

    expect(mockChatService.startConversation).toHaveBeenCalledWith(
      'customer-2',
      dto,
    );
    expect(mockChatGateway.emitConversationUpdated).toHaveBeenCalledWith(
      'conv-2',
    );
    expect(result).toEqual(conversation);
  });

  it('should send custom order quote and emit chat updates after service returns', async () => {
    const request = createRequest('seller-1');
    request.user.roles = ['ROLE_SELLER'];
    const dto = {
      title: 'Handmade vase',
      price: 150000,
      message: 'Here is the quote',
    };
    const message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'seller-1',
      type: 'CUSTOM_ORDER_OFFER',
      payload: {
        text: 'Here is the quote',
        customOrderId: 'order-1',
        quoteSnapshot: { title: 'Handmade vase' },
      },
    };
    mockChatService.sendCustomOrderQuote.mockResolvedValue(message);
    mockChatGateway.emitConversationUpdated.mockResolvedValue(undefined);

    const result = await controller.sendCustomOrderQuote(
      request,
      'conv-1',
      dto,
    );

    expect(mockChatService.sendCustomOrderQuote).toHaveBeenCalledWith(
      'seller-1',
      'conv-1',
      dto,
    );
    expect(mockChatGateway.emitMessageCreated).toHaveBeenCalledWith(
      'conv-1',
      message,
    );
    expect(mockChatGateway.emitConversationUpdated).toHaveBeenCalledWith(
      'conv-1',
    );
    expect(result).toEqual(message);
  });

  it('should require seller role metadata on custom order quote endpoint', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, controller.sendCustomOrderQuote),
    ).toEqual(['ROLE_SELLER']);
  });

  it('should keep text endpoint behavior unchanged', async () => {
    const request = createRequest('user-1');
    const dto = { text: 'Hello' };
    const message = { id: 'msg-text-1', conversationId: 'conv-1' };
    mockChatService.sendTextMessage.mockResolvedValue(message);
    mockChatGateway.emitConversationUpdated.mockResolvedValue(undefined);

    const result = await controller.sendTextMessage(request, 'conv-1', dto);

    expect(mockChatService.sendTextMessage).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
      dto,
    );
    expect(mockChatGateway.emitMessageCreated).toHaveBeenCalledWith(
      'conv-1',
      message,
    );
    expect(mockChatGateway.emitConversationUpdated).toHaveBeenCalledWith(
      'conv-1',
    );
    expect(result).toEqual(message);
  });
});
