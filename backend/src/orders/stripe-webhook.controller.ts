import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { StripeService } from '../stripe/stripe.service';
import { CustomOrdersService } from '../custom-orders/custom-orders.service';
import {
  describeErrorForObservability,
  emitObservabilityEvent,
  extractRequestIdFromHeaders,
} from '../common/observability/observability.util';

type StripePaymentIntentPayload = {
  id: string;
  amount: number;
  amount_received?: number | null;
  currency: string;
  metadata?: Record<string, string>;
};

@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly ordersService: OrdersService,
    private readonly customOrdersService: CustomOrdersService,
  ) {}

  private extractPaymentIntentId(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' && id.length > 0 ? id : undefined;
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature?: string,
  ) {
    const requestId = extractRequestIdFromHeaders(
      req.headers as Record<string, unknown>,
    );

    if (!signature) {
      emitObservabilityEvent(this.logger, 'warn', 'payment_webhook_failed', {
        requestId,
        reason: 'missing_signature',
        statusCode: 400,
      });
      throw new BadRequestException('Missing Stripe signature');
    }

    try {
      const payload = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body));
      const event = this.stripeService.constructWebhookEvent(
        payload,
        signature,
      );

      const paymentIntentId = this.extractPaymentIntentId(event.data.object);
      emitObservabilityEvent(this.logger, 'log', 'payment_webhook_received', {
        requestId,
        eventId: event.id,
        eventType: event.type,
        paymentIntentId,
      });

      let result: Record<string, unknown>;
      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as StripePaymentIntentPayload;
        const successPayload = {
          eventId: event.id,
          type: event.type,
          paymentIntentId: intent.id,
          amount: intent.amount_received || intent.amount,
          currency: intent.currency,
          metadata: intent.metadata ?? {},
        };
        const serviceResult =
          await this.ordersService.handlePaymentIntentSucceeded(successPayload);
        result =
          serviceResult.reason === 'order_not_found'
            ? await this.customOrdersService.handlePaymentIntentSucceeded(
                successPayload,
              )
            : serviceResult;
      } else if (
        event.type === 'payment_intent.payment_failed' ||
        event.type === 'payment_intent.canceled'
      ) {
        const intent = event.data.object as StripePaymentIntentPayload;
        const failurePayload = {
          eventId: event.id,
          type: event.type,
          paymentIntentId: intent.id,
        };
        const serviceResult =
          await this.ordersService.handlePaymentIntentFailed(failurePayload);
        result =
          serviceResult.reason === 'order_not_found'
            ? await this.customOrdersService.handlePaymentIntentFailed(
                failurePayload,
              )
            : serviceResult;
      } else {
        result = {
          received: true,
          processed: false,
          reason: 'ignored_event',
        };
      }

      emitObservabilityEvent(this.logger, 'log', 'payment_webhook_processed', {
        requestId,
        eventId: event.id,
        eventType: event.type,
        paymentIntentId,
        processed: Boolean(result.processed),
        reason: typeof result.reason === 'string' ? result.reason : 'processed',
        orderId:
          typeof result.orderId === 'string' ? result.orderId : undefined,
        customOrderId:
          typeof result.customOrderId === 'string'
            ? result.customOrderId
            : undefined,
      });

      return result;
    } catch (error) {
      emitObservabilityEvent(this.logger, 'error', 'payment_webhook_failed', {
        requestId,
        hasSig: true,
        ...describeErrorForObservability(error),
      });
      throw error;
    }
  }
}
