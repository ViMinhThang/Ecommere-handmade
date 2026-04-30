import {
  BadRequestException,
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { OrderStatus, PaymentMethod } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: { shippingAddress: Record<string, unknown>; paymentMethod?: string },
  ) {
    const paymentMethod = body.paymentMethod ?? PaymentMethod.STRIPE;

    if (
      paymentMethod !== PaymentMethod.STRIPE &&
      paymentMethod !== PaymentMethod.COD
    ) {
      throw new BadRequestException('Invalid payment method');
    }

    return this.ordersService.checkout(
      req.user.id,
      body.shippingAddress,
      paymentMethod as PaymentMethod,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm-payment')
  async confirmPayment(
    @Request() req: AuthenticatedRequest,
    @Body() body: { paymentIntentId: string },
  ) {
    return this.ordersService.confirmPayment(req.user.id, body.paymentIntentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  async getMyOrders(@Request() req: AuthenticatedRequest) {
    return this.ordersService.findAllSubOrdersByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller-orders')
  async getSellerOrders(@Request() req: AuthenticatedRequest) {
    return this.ordersService.findAllSubOrdersBySeller(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sub-order/:id')
  async getSubOrder(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.ordersService.findSubOrderById(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrder(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOrderById(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('sub-order/:id/status')
  async updateStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateSubOrderStatus(req.user.id, id, status);
  }
}
