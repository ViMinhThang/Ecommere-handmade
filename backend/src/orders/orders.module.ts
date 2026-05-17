import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { CartModule } from '../cart/cart.module';
import { StripeWebhookController } from './stripe-webhook.controller';
import { CustomOrdersModule } from '../custom-orders/custom-orders.module';
import { SettingsModule } from '../settings/settings.module';
import { PaymentReliabilityService } from './payment-reliability.service';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    CartModule,
    CustomOrdersModule,
    SettingsModule,
    RewardsModule,
  ],
  controllers: [OrdersController, StripeWebhookController],
  providers: [OrdersService, PaymentReliabilityService],
  exports: [OrdersService],
})
export class OrdersModule {}
