import { Module } from '@nestjs/common';
import { CustomOrdersService } from './custom-orders.service';
import { CustomOrdersController } from './custom-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [PrismaModule, StripeModule],
  providers: [CustomOrdersService],
  controllers: [CustomOrdersController],
})
export class CustomOrdersModule {}
