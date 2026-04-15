import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(@Req() req: any, @Body() body: { shippingAddress: any }) {
    return this.ordersService.checkout(req.user.id, body.shippingAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm-payment')
  async confirmPayment(@Req() req: any, @Body() body: { paymentIntentId: string }) {
    return this.ordersService.confirmPayment(req.user.id, body.paymentIntentId);
  }
}
