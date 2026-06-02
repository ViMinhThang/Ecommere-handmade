import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomOrdersService } from './custom-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { CreateCustomOrderDto } from './dto/create-custom-order.dto';
import { RequestRevisionDto } from './dto/request-revision.dto';
import { ConfirmCustomOrderPaymentDto } from './dto/confirm-custom-order-payment.dto';
import { UpdateCustomOrderStatusDto } from './dto/update-custom-order-status.dto';
import { UpdateSketchDto } from './dto/update-sketch.dto';
import { CreateCustomOrderRefundDto } from './dto/create-custom-order-refund.dto';
import { CreateCustomOrderProgressEventDto } from './dto/create-custom-order-progress-event.dto';
import { CreateCustomOrderReviewDto } from './dto/create-custom-order-review.dto';
import { SellerReplyCustomOrderReviewDto } from './dto/seller-reply-custom-order-review.dto';

@Controller('custom-orders')
export class CustomOrdersController {
  constructor(private readonly customOrdersService: CustomOrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createData: CreateCustomOrderDto,
  ) {
    return this.customOrdersService.createCustomOrder(req.user.id, createData);
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  getMyOrders(@Request() req: AuthenticatedRequest) {
    return this.customOrdersService.getCustomerCustomOrders(req.user.id);
  }

  @Get('seller-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  getSellerOrders(@Request() req: AuthenticatedRequest) {
    return this.customOrdersService.getSellerCustomOrders(
      req.user.id,
      req.user.roles,
    );
  }

  @Post('admin/:id/refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  refundCustomOrder(
    @Param('id') id: string,
    @Body() body: CreateCustomOrderRefundDto,
  ) {
    return this.customOrdersService.refundCustomOrder(id, body);
  }

  @Get('admin/:id/ledger')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  getAdminCustomOrderLedger(@Param('id') id: string) {
    return this.customOrdersService.getAdminCustomOrderLedger(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.customOrdersService.getCustomOrderById(
      id,
      req.user.id,
      req.user.roles,
    );
  }

  @Get(':id/progress')
  @UseGuards(JwtAuthGuard)
  getProgressEvents(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.customOrdersService.getProgressEvents(
      id,
      req.user.id,
      req.user.roles,
    );
  }

  @Post(':id/progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  createProgressEvent(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateCustomOrderProgressEventDto,
  ) {
    return this.customOrdersService.createProgressEvent(
      id,
      req.user.id,
      req.user.roles,
      body,
    );
  }

  @Post(':id/request-revision')
  @UseGuards(JwtAuthGuard)
  requestRevision(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: RequestRevisionDto,
  ) {
    return this.customOrdersService.requestRevision(
      id,
      req.user.id,
      body.revisionNote,
    );
  }

  @Post(':id/approve-sketch')
  @UseGuards(JwtAuthGuard)
  approveSketch(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.customOrdersService.approveSketch(id, req.user.id);
  }

  @Post(':id/confirm-payment')
  @UseGuards(JwtAuthGuard)
  confirmPayment(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: ConfirmCustomOrderPaymentDto,
  ) {
    return this.customOrdersService.confirmPayment(
      id,
      req.user.id,
      body.paymentIntentId,
    );
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelCustomOrder(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.customOrdersService.cancelOrder(
      id,
      req.user.id,
      req.user.roles,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateCustomOrderStatusDto,
  ) {
    return this.customOrdersService.advanceStatus(
      id,
      req.user.id,
      req.user.roles,
      body.status,
    );
  }

  @Patch(':id/sketch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  updateSketch(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateSketchDto,
  ) {
    return this.customOrdersService.updateSketch(id, req.user.id, body);
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard)
  createReview(
    @Request() req: AuthenticatedRequest,
    @Param('id') customOrderId: string,
    @Body() data: CreateCustomOrderReviewDto,
  ) {
    return this.customOrdersService.createCustomOrderReview(
      req.user.id,
      customOrderId,
      data,
    );
  }

  @Get(':id/review')
  getReview(@Param('id') customOrderId: string) {
    return this.customOrdersService.getCustomOrderReview(customOrderId);
  }

  @Patch('reviews/:reviewId/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  sellerReplyToReview(
    @Request() req: AuthenticatedRequest,
    @Param('reviewId') reviewId: string,
    @Body() body: SellerReplyCustomOrderReviewDto,
  ) {
    return this.customOrdersService.sellerReplyToCustomOrderReview(
      req.user.id,
      req.user.roles,
      reviewId,
      body.reply,
    );
  }

  @Get('seller/reviews/latest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  getSellerLatestReviews(@Request() req: AuthenticatedRequest) {
    return this.customOrdersService.getSellerLatestCustomOrderReviews(
      req.user.id,
    );
  }
}
