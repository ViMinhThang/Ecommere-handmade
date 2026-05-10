import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { CustomOrdersService } from '../custom-orders/custom-orders.service';
import {
  StripeService,
  type StripeWebhookEvent,
} from '../stripe/stripe.service';
import { OrdersService } from './orders.service';
import { StripeWebhookController } from './stripe-webhook.controller';

type WebhookResult = {
  received: boolean;
  processed: boolean;
  reason?: string;
  orderId?: string;
  customOrderId?: string;
};

type PaymentIntentPayload = {
  id: string;
  amount: number;
  amount_received?: number | null;
  currency: string;
  metadata?: Record<string, string>;
};

describe('StripeWebhookController', () => {
  const mockStripeService = {
    constructWebhookEvent: jest.fn(),
  };
  const mockOrdersService = {
    handlePaymentIntentSucceeded: jest.fn(),
    handlePaymentIntentFailed: jest.fn(),
  };
  const mockCustomOrdersService = {
    handlePaymentIntentSucceeded: jest.fn(),
    handlePaymentIntentFailed: jest.fn(),
  };

  let controller: StripeWebhookController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StripeWebhookController(
      mockStripeService as unknown as StripeService,
      mockOrdersService as unknown as OrdersService,
      mockCustomOrdersService as unknown as CustomOrdersService,
    );
  });

  it('routes succeeded payment intents to custom orders when no standard order exists', async () => {
    mockStripeService.constructWebhookEvent.mockReturnValue(
      createPaymentIntentEvent('payment_intent.succeeded', {
        id: 'pi_custom',
        amount: 100000,
        amount_received: 100000,
        currency: 'vnd',
        metadata: { customOrderId: 'co_1' },
      }),
    );
    mockOrdersService.handlePaymentIntentSucceeded.mockResolvedValue({
      received: true,
      processed: false,
      reason: 'order_not_found',
    } satisfies WebhookResult);
    mockCustomOrdersService.handlePaymentIntentSucceeded.mockResolvedValue({
      received: true,
      processed: true,
      customOrderId: 'co_1',
    } satisfies WebhookResult);

    const result = await controller.handleWebhook(createRequest(), 'sig_1');

    expect(result).toMatchObject({ processed: true, customOrderId: 'co_1' });
    expect(
      mockCustomOrdersService.handlePaymentIntentSucceeded,
    ).toHaveBeenCalledWith({
      eventId: 'evt_1',
      type: 'payment_intent.succeeded',
      paymentIntentId: 'pi_custom',
      amount: 100000,
      currency: 'vnd',
      metadata: { customOrderId: 'co_1' },
    });
  });

  it('routes failed payment intents to custom orders when no standard order exists', async () => {
    mockStripeService.constructWebhookEvent.mockReturnValue(
      createPaymentIntentEvent('payment_intent.payment_failed', {
        id: 'pi_custom',
        amount: 100000,
        currency: 'vnd',
      }),
    );
    mockOrdersService.handlePaymentIntentFailed.mockResolvedValue({
      received: true,
      processed: false,
      reason: 'order_not_found',
    } satisfies WebhookResult);
    mockCustomOrdersService.handlePaymentIntentFailed.mockResolvedValue({
      received: true,
      processed: true,
      customOrderId: 'co_1',
    } satisfies WebhookResult);

    const result = await controller.handleWebhook(createRequest(), 'sig_1');

    expect(result).toMatchObject({ processed: true, customOrderId: 'co_1' });
    expect(
      mockCustomOrdersService.handlePaymentIntentFailed,
    ).toHaveBeenCalledWith({
      eventId: 'evt_1',
      type: 'payment_intent.payment_failed',
      paymentIntentId: 'pi_custom',
    });
  });

  it('rejects webhook calls without a Stripe signature', async () => {
    await expect(controller.handleWebhook(createRequest())).rejects.toThrow(
      BadRequestException,
    );
  });
});

function createRequest(): Request {
  return { body: Buffer.from('{}') } as Request;
}

function createPaymentIntentEvent(
  type: string,
  intent: PaymentIntentPayload,
): StripeWebhookEvent {
  return {
    id: 'evt_1',
    type,
    data: {
      object: intent,
    },
  };
}
