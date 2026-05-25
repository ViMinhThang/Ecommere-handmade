import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ShopReviewsController } from './shop-reviews.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController, ShopReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
