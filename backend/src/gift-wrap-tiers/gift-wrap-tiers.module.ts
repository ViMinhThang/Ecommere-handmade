import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminGiftWrapTiersController,
  GiftWrapTiersController,
} from './gift-wrap-tiers.controller';
import { GiftWrapTiersService } from './gift-wrap-tiers.service';

@Module({
  imports: [PrismaModule],
  controllers: [GiftWrapTiersController, AdminGiftWrapTiersController],
  providers: [GiftWrapTiersService],
  exports: [GiftWrapTiersService],
})
export class GiftWrapTiersModule {}
