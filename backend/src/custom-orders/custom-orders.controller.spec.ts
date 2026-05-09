import { Test, TestingModule } from '@nestjs/testing';
import { CustomOrdersController } from './custom-orders.controller';
import { CustomOrdersService } from './custom-orders.service';

describe('CustomOrdersController', () => {
  let controller: CustomOrdersController;
  const mockCustomOrdersService = {
    createCustomOrder: jest.fn(),
    getCustomerCustomOrders: jest.fn(),
    getSellerCustomOrders: jest.fn(),
    getCustomOrderById: jest.fn(),
    requestRevision: jest.fn(),
    approveSketch: jest.fn(),
    confirmPayment: jest.fn(),
    advanceStatus: jest.fn(),
    updateSketch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomOrdersController],
      providers: [
        { provide: CustomOrdersService, useValue: mockCustomOrdersService },
      ],
    }).compile();

    controller = module.get<CustomOrdersController>(CustomOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
