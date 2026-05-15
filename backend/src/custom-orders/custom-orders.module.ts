import { Module } from '@nestjs/common';
import { CustomOrdersService } from './custom-orders.service';
import { CustomOrdersController } from './custom-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, StripeModule, SettingsModule],
  providers: [CustomOrdersService],
  controllers: [CustomOrdersController],
  exports: [CustomOrdersService],
})
export class CustomOrdersModule {}
