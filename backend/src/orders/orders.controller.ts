import { Controller, Post, Body, Req, UseGuards, Get, Param, Patch } from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  async getMyOrders(@Req() req: any) {
    return this.ordersService.findAllSubOrdersByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrder(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.findOrderById(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sub-order/:id')
  async getSubOrder(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.findSubOrderById(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller-orders')
  async getSellerOrders(@Req() req: any) {
    return this.ordersService.findAllSubOrdersBySeller(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('sub-order/:id/status')
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateSubOrderStatus(req.user.id, id, status);
  }
}
