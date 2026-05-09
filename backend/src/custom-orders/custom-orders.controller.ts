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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.customOrdersService.getCustomOrderById(
      id,
      req.user.id,
      req.user.roles,
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
}
