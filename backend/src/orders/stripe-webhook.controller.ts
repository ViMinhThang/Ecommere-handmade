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
      return this.ordersService.handlePaymentIntentSucceeded({
        eventId: event.id,
        type: event.type,
        paymentIntentId: intent.id,
        amount: intent.amount_received || intent.amount,
        currency: intent.currency,
        metadata: intent.metadata ?? {},
      });
    }

    if (
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      const intent = event.data.object as StripePaymentIntentPayload;
      return this.ordersService.handlePaymentIntentFailed({
        eventId: event.id,
        type: event.type,
        paymentIntentId: intent.id,
      });
    }

    return { received: true, processed: false, reason: 'ignored_event' };
  }
}
