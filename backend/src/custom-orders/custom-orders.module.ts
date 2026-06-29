import { Module } from '@nestjs/common';
import { CustomOrdersService } from './custom-orders.service';
import { CustomOrdersController } from './custom-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { SettingsModule } from '../settings/settings.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [PrismaModule, StripeModule, SettingsModule, VouchersModule],
  providers: [CustomOrdersService],
  controllers: [CustomOrdersController],
  exports: [CustomOrdersService],
})
export class CustomOrdersModule {}
