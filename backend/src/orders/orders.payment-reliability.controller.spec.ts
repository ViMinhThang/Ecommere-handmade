import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentReliabilityService } from './payment-reliability.service';

describe('OrdersController payment reliability routes', () => {
  let app: INestApplication<App>;

  const mockOrdersService = {
    findAdminOrderById: jest.fn(),
    findOrderById: jest.fn(),
  };

  const mockPaymentReliabilityService = {
    getSummary: jest.fn(),
    getAnomalies: jest.fn(),
    getReconciliation: jest.fn(),
    getWebhooks: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: (context: ExecutionContext) => {
      const requestRef = context.switchToHttp().getRequest<{
        headers: Record<string, string | string[] | undefined>;
        user?: {
          id: string;
          email: string;
          roles: string[];
        };
      }>();

      const rawRole = requestRef.headers['x-test-role'];
      const roleString = Array.isArray(rawRole) ? rawRole[0] : rawRole;
      const roles = roleString
        ? roleString
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

      requestRef.user = {
        id: 'test-user-id',
        email: 'test-user@example.com',
        roles,
      };

      return true;
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPaymentReliabilityService.getSummary.mockResolvedValue({
      totals: {
        stripeOrders: 0,
        customOrders: 0,
        webhookEvents: 0,
        anomalies: 0,
        reconciliationRows: 0,
        unreconciled: 0,
      },
      bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      byType: {
        STRIPE_ORDER_UNPAID_EXPIRED: 0,
        CUSTOM_ORDER_UNPAID_EXPIRED: 0,
        PAID_ORDER_MISSING_CAPTURE_LEDGER: 0,
        REFUND_STATUS_MISMATCH: 0,
        PAID_WITHOUT_WEBHOOK_RECORD: 0,
      },
      generatedAt: '2026-05-14T00:00:00.000Z',
    });
    mockPaymentReliabilityService.getAnomalies.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    mockPaymentReliabilityService.getReconciliation.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    mockPaymentReliabilityService.getWebhooks.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    mockOrdersService.findAdminOrderById.mockResolvedValue({
      id: 'order-admin-1',
    });
    mockOrdersService.findOrderById.mockResolvedValue({
      id: 'order-public-1',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        {
          provide: PaymentReliabilityService,
          useValue: mockPaymentReliabilityService,
        },
        RolesGuard,
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows admin to access payment reliability summary', async () => {
    await request(app.getHttpServer())
      .get('/orders/admin/payment-reliability/summary')
      .set('x-test-role', 'ROLE_ADMIN')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            totals: expect.any(Object),
            bySeverity: expect.any(Object),
            byType: expect.any(Object),
            generatedAt: expect.any(String),
          }),
        );
      });
  });

  it('forbids seller and customer on payment reliability routes', async () => {
    await request(app.getHttpServer())
      .get('/orders/admin/payment-reliability/summary')
      .set('x-test-role', 'ROLE_SELLER')
      .expect(403);

    await request(app.getHttpServer())
      .get('/orders/admin/payment-reliability/summary')
      .set('x-test-role', 'ROLE_USER')
      .expect(403);
  });

  it('returns list contract shape for anomalies/reconciliation/webhooks', async () => {
    await request(app.getHttpServer())
      .get('/orders/admin/payment-reliability/anomalies')
      .set('x-test-role', 'ROLE_ADMIN')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          data: expect.any(Array),
          meta: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
          }),
        });
      });

    await request(app.getHttpServer())
      .get('/orders/admin/payment-reliability/reconciliation')
      .set('x-test-role', 'ROLE_ADMIN')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          data: expect.any(Array),
          meta: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
          }),
        });
      });

    await request(app.getHttpServer())
      .get('/orders/admin/payment-reliability/webhooks')
      .set('x-test-role', 'ROLE_ADMIN')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          data: expect.any(Array),
          meta: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
          }),
        });
      });
  });

  it('does not conflict with dynamic admin route /orders/admin/:id', async () => {
    await request(app.getHttpServer())
      .get('/orders/admin/order-admin-1')
      .set('x-test-role', 'ROLE_ADMIN')
      .expect(200)
      .expect({ id: 'order-admin-1' });

    expect(mockOrdersService.findAdminOrderById).toHaveBeenCalledWith(
      'order-admin-1',
    );
  });

  it('does not conflict with /orders/:id route', async () => {
    await request(app.getHttpServer())
      .get('/orders/order-public-1')
      .set('x-test-role', 'ROLE_USER')
      .expect(200)
      .expect({ id: 'order-public-1' });

    expect(mockOrdersService.findOrderById).toHaveBeenCalledWith(
      'test-user-id',
      ['ROLE_USER'],
      'order-public-1',
    );
  });
});
