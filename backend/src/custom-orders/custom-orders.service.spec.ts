import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { CustomOrdersService } from './custom-orders.service';

describe('CustomOrdersService', () => {
  let service: CustomOrdersService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
    },
    customOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const mockStripe = {
    createPaymentIntent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
      ],
    }).compile();

    service = module.get<CustomOrdersService>(CustomOrdersService);
  });

  it('rejects payment confirmation by another customer', async () => {
    mockPrisma.customOrder.findUnique.mockResolvedValue({
      id: 'co_1',
      customerId: 'customer_1',
      sellerId: 'seller_1',
      paymentIntentId: 'pi_1',
      status: CustomOrderStatus.AWAITING_PAYMENT,
      price: 100000,
    });

    await expect(
      service.confirmPayment('co_1', 'customer_2', 'pi_1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects payment intents that do not belong to the custom order', async () => {
    mockPrisma.customOrder.findUnique.mockResolvedValue({
      id: 'co_1',
      customerId: 'customer_1',
      sellerId: 'seller_1',
      paymentIntentId: 'pi_order',
      status: CustomOrderStatus.AWAITING_PAYMENT,
      price: 100000,
    });

    await expect(
      service.confirmPayment('co_1', 'customer_1', 'pi_other'),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents sellers from jumping custom order into paid work states', async () => {
    mockPrisma.customOrder.findUnique.mockResolvedValue({
      id: 'co_1',
      customerId: 'customer_1',
      sellerId: 'seller_1',
      status: CustomOrderStatus.AWAITING_PAYMENT,
    });

    await expect(
      service.advanceStatus(
        'co_1',
        'seller_1',
        ['ROLE_SELLER'],
        CustomOrderStatus.CRAFTING,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
