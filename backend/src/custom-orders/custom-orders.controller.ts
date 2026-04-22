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

@Controller('custom-orders')
export class CustomOrdersController {
  constructor(private readonly customOrdersService: CustomOrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  create(@Request() req: AuthenticatedRequest, @Body() createData: any) {
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
    return this.customOrdersService.getSellerCustomOrders(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customOrdersService.getCustomOrderById(id);
  }

  @Post(':id/request-revision')
  @UseGuards(JwtAuthGuard)
  requestRevision(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { revisionNote: string },
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
    @Body() body: { paymentIntentId: string },
  ) {
    return this.customOrdersService.confirmPayment(id, body.paymentIntentId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { status: any },
  ) {
    return this.customOrdersService.advanceStatus(id, req.user.id, body.status);
  }

  @Patch(':id/sketch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  updateSketch(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: any,
  ) {
    return this.customOrdersService.updateSketch(id, req.user.id, body);
  }
}
