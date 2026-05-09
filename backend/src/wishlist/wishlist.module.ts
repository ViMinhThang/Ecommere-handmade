import { Module } from '@nestjs/common';
import { FlashSalesModule } from '../flash-sales/flash-sales.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [PrismaModule, FlashSalesModule],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
