import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { StripeService } from '../stripe/stripe.service';
import { CustomOrdersService } from '../custom-orders/custom-orders.service';

type StripePaymentIntentPayload = {
  id: string;
  amount: number;
  amount_received?: number | null;
  currency: string;
  metadata?: Record<string, string>;
};

@Controller('stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly ordersService: OrdersService,
    private readonly customOrdersService: CustomOrdersService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    const payload = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body));
    const event = this.stripeService.constructWebhookEvent(payload, signature);

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as StripePaymentIntentPayload;
      const payload = {
        eventId: event.id,
        type: event.type,
        paymentIntentId: intent.id,
        amount: intent.amount_received || intent.amount,
        currency: intent.currency,
        metadata: intent.metadata ?? {},
      };
      const result =
        await this.ordersService.handlePaymentIntentSucceeded(payload);
      if (result.reason === 'order_not_found') {
        return this.customOrdersService.handlePaymentIntentSucceeded(payload);
      }

      return result;
    }

    if (
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      const intent = event.data.object as StripePaymentIntentPayload;
      const payload = {
        eventId: event.id,
        type: event.type,
        paymentIntentId: intent.id,
      };
      const result =
        await this.ordersService.handlePaymentIntentFailed(payload);
      if (result.reason === 'order_not_found') {
        return this.customOrdersService.handlePaymentIntentFailed(payload);
      }

      return result;
    }

    return { received: true, processed: false, reason: 'ignored_event' };
  }
}
