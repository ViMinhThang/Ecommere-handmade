import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: any;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey || secretKey === '') {
      this.logger.error(
        'STRIPE_SECRET_KEY is missing. Stripe will not function correctly.',
      );
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY configuration is missing',
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-03-25.dahlia' as any,
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'vnd',
    metadata?: Record<string, string>,
  ) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      return paymentIntent;
    } catch (error: any) {
      this.logger.error(`Error creating PaymentIntent: ${error.message}`);
      throw new InternalServerErrorException('Failed to initialize payment');
    }
  }

  async verifyPaymentIntent(paymentIntentId: string): Promise<boolean> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return intent.status === 'succeeded';
    } catch (error: any) {
      this.logger.error(`Error verifying PaymentIntent: ${error.message}`);
      return false;
    }
  }
}
