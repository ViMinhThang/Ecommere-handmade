import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { CreateShopReviewDto } from './dto/create-shop-review.dto';
import { ListShopReviewsQueryDto } from './dto/list-shop-reviews-query.dto';
import { ReviewsService } from './reviews.service';

@Controller('sellers/:sellerId/reviews')
export class ShopReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  listShopReviews(
    @Param('sellerId') sellerId: string,
    @Query() query: ListShopReviewsQueryDto,
  ) {
    return this.reviewsService.listShopReviews(sellerId, query);
  }

  @Get('summary')
  getShopReviewSummary(@Param('sellerId') sellerId: string) {
    return this.reviewsService.getShopReviewSummary(sellerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyShopReviewStatus(
    @Req() req: AuthenticatedRequest,
    @Param('sellerId') sellerId: string,
  ) {
    return this.reviewsService.getMyShopReviewStatus(
      req.user.id,
      req.user.roles,
      sellerId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createShopReview(
    @Req() req: AuthenticatedRequest,
    @Param('sellerId') sellerId: string,
    @Body() data: CreateShopReviewDto,
  ) {
    return this.reviewsService.createShopReview(
      req.user.id,
      req.user.roles,
      sellerId,
      data,
    );
  }
}
