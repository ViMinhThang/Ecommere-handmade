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
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private parseEnumValue<T extends Record<string, string>>(
    value: string | undefined,
    enumObject: T,
    fieldName: string,
  ): T[keyof T] | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.toUpperCase();

    if (!Object.values(enumObject).includes(normalized as T[keyof T])) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return normalized as T[keyof T];
  }

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
  @Patch(':id/cancel')
  async cancelOrder(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.ordersService.cancelOrder(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  async getMyOrders(@Request() req: AuthenticatedRequest) {
    return this.ordersService.findAllSubOrdersByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER')
  @Get('seller-orders')
  async getSellerOrders(@Request() req: AuthenticatedRequest) {
    return this.ordersService.findAllSubOrdersBySeller(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @Get('admin')
  async getAdminOrders(
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('customer') customer?: string,
    @Query('seller') seller?: string,
  ) {
    return this.ordersService.findAdminOrders({
      status: this.parseEnumValue(status, OrderStatus, 'status'),
      paymentMethod: this.parseEnumValue(
        paymentMethod,
        PaymentMethod,
        'paymentMethod',
      ),
      paymentStatus: this.parseEnumValue(
        paymentStatus,
        PaymentStatus,
        'paymentStatus',
      ),
      customer,
      seller,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @Get('admin/:id')
  async getAdminOrder(@Param('id') id: string) {
    return this.ordersService.findAdminOrderById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @Patch('admin/:id/status')
  async updateAdminOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const normalizedStatus = this.parseEnumValue(
      status,
      OrderStatus,
      'status',
    );

    if (!normalizedStatus) {
      throw new BadRequestException('Status is required');
    }

    return this.ordersService.updateAdminOrderStatus(id, normalizedStatus);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sub-order/:id')
  async getSubOrder(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.ordersService.findSubOrderById(req.user.id, req.user.roles, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrder(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOrderById(req.user.id, req.user.roles, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  @Patch('sub-order/:id/status')
  async updateStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const normalizedStatus = this.parseEnumValue(
      status,
      OrderStatus,
      'status',
    );

    if (!normalizedStatus) {
      throw new BadRequestException('Status is required');
    }

    return this.ordersService.updateSubOrderStatus(
      req.user.id,
      req.user.roles,
      id,
      normalizedStatus,
    );
  }
}
