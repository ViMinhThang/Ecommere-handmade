import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createReview(@Req() req: any, @Body() data: any) {
    return this.reviewsService.createReview(req.user.id, data);
  }

  @Get('product/:productId')
  async getProductReviews(@Param('productId') productId: string) {
    return this.reviewsService.getReviewsByProduct(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reply')
  async sellerReply(
    @Req() req: any,
    @Param('id') reviewId: string,
    @Body('reply') reply: string,
  ) {
    return this.reviewsService.sellerReply(req.user.id, reviewId, reply);
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller/latest')
  async getSellerLatest(@Req() req: any) {
    return this.reviewsService.getLatestReviewsForSeller(req.user.id);
  }
}
