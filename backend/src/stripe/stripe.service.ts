import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ServiceUnavailableException,
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

export type StripeRefund = {
  id: string;
  status: string | null;
  amount: number;
  currency: string;
  payment_intent: string | null | { id: string };
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
  refunds: {
    create(
      params: {
        payment_intent: string;
        amount?: number;
        metadata?: Record<string, string>;
      },
      options?: { idempotencyKey?: string },
    ): Promise<StripeRefund>;
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
  private stripe?: StripeClient;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService
      .get<string>('STRIPE_SECRET_KEY')
      ?.trim();

    if (!this.hasUsableStripeSecret(secretKey)) {
      this.logger.warn(
        'Stripe is not configured. COD checkout remains available locally.',
      );
      return;
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-03-25.dahlia',
    }) as unknown as StripeClient;
  }

  private hasUsableStripeSecret(secretKey?: string): secretKey is string {
    if (!secretKey) {
      return false;
    }

    const normalized = secretKey.toLowerCase();
    return (
      !normalized.includes('replace') &&
      !normalized.includes('your_') &&
      !normalized.includes('your-')
    );
  }

  private getStripeClient() {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured. Use COD checkout or set STRIPE_SECRET_KEY.',
      );
    }

    return this.stripe;
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
      const paymentIntent = await this.getStripeClient().paymentIntents.create({
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
      return await this.getStripeClient().paymentIntents.update(
        paymentIntentId,
        {
          metadata,
        },
      );
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
      return await this.getStripeClient().paymentIntents.retrieve(
        paymentIntentId,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Error retrieving PaymentIntent: ${this.getErrorMessage(error)}`,
      );
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  async cancelPaymentIntent(paymentIntentId: string) {
    if (!this.stripe) {
      this.logger.warn(
        'Skip cancelling PaymentIntent because Stripe is not configured.',
      );
      return null;
    }

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

  async createRefund(
    paymentIntentId: string,
    amount: number,
    metadata?: Record<string, string>,
    idempotencyKey?: string,
  ) {
    try {
      return await this.getStripeClient().refunds.create(
        {
          payment_intent: paymentIntentId,
          amount,
          metadata,
        },
        idempotencyKey ? { idempotencyKey } : undefined,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Error creating refund: ${this.getErrorMessage(error)}`,
      );
      throw new InternalServerErrorException('Failed to initialize refund');
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
    const stripe = this.getStripeClient();
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'STRIPE_WEBHOOK_SECRET configuration is missing',
      );
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
