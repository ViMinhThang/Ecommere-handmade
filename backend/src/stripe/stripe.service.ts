import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type StripePaymentIntent = {
  id: string;
  client_secret: string | null;
  status: string;
  amount: number;
  amount_received?: number | null;
  currency: string;
  metadata: Record<string, string>;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
};

type StripeClient = {
  paymentIntents: {
    create(params: {
      amount: number;
      currency: string;
      metadata?: Record<string, string>;
      automatic_payment_methods: { enabled: boolean };
    }): Promise<StripePaymentIntent>;
    update(
      paymentIntentId: string,
      params: { metadata: Record<string, string> },
    ): Promise<StripePaymentIntent>;
    retrieve(paymentIntentId: string): Promise<StripePaymentIntent>;
    cancel(paymentIntentId: string): Promise<StripePaymentIntent>;
  };
  webhooks: {
    constructEvent(
      payload: Buffer,
      signature: string,
      webhookSecret: string,
    ): StripeWebhookEvent;
  };
};

@Injectable()
export class StripeService {
  private stripe: StripeClient;
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
      apiVersion: '2026-03-25.dahlia',
    }) as unknown as StripeClient;
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
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
    } catch (error: unknown) {
      this.logger.error(
        `Error creating PaymentIntent: ${this.getErrorMessage(error)}`,
      );
      throw new InternalServerErrorException('Failed to initialize payment');
    }
  }

  async updatePaymentIntentMetadata(
    paymentIntentId: string,
    metadata: Record<string, string>,
  ) {
    try {
      return await this.stripe.paymentIntents.update(paymentIntentId, {
        metadata,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Error updating PaymentIntent metadata: ${this.getErrorMessage(error)}`,
      );
      throw new InternalServerErrorException(
        'Failed to update payment metadata',
      );
    }
  }

  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<StripePaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error: unknown) {
      this.logger.error(
        `Error retrieving PaymentIntent: ${this.getErrorMessage(error)}`,
      );
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  async cancelPaymentIntent(paymentIntentId: string) {
    try {
      const intent = await this.retrievePaymentIntent(paymentIntentId);
      if (['canceled', 'succeeded'].includes(intent.status)) {
        return intent;
      }

      return await this.stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error: unknown) {
      this.logger.warn(
        `Error cancelling PaymentIntent: ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  async verifyPaymentIntent(paymentIntentId: string): Promise<boolean> {
    try {
      const intent = await this.retrievePaymentIntent(paymentIntentId);
      return intent.status === 'succeeded';
    } catch (error: unknown) {
      this.logger.error(
        `Error verifying PaymentIntent: ${this.getErrorMessage(error)}`,
      );
      return false;
    }
  }

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): StripeWebhookEvent {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET configuration is missing',
      );
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}
