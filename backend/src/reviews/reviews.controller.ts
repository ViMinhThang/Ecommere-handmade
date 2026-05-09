import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { CreateReviewDto } from './dto/create-review.dto';
import { SellerReplyDto } from './dto/seller-reply.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createReview(
    @Req() req: AuthenticatedRequest,
    @Body() data: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(req.user.id, data);
  }

  @Get('product/:productId')
  async getProductReviews(@Param('productId') productId: string) {
    return this.reviewsService.getReviewsByProduct(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER')
  @Patch(':id/reply')
  async sellerReply(
    @Req() req: AuthenticatedRequest,
    @Param('id') reviewId: string,
    @Body() body: SellerReplyDto,
  ) {
    return this.reviewsService.sellerReply(
      req.user.id,
      req.user.roles,
      reviewId,
      body.reply,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER')
  @Get('seller/latest')
  async getSellerLatest(@Req() req: AuthenticatedRequest) {
    return this.reviewsService.getLatestReviewsForSeller(req.user.id);
  }
}
