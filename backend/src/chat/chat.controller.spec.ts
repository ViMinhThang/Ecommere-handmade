import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
});
