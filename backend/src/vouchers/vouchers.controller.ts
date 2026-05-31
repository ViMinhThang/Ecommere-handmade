import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  findAll(@Query() pagination?: PaginationDto) {
    return this.vouchersService.findAll(pagination);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all')
  @Roles('ROLE_ADMIN')
  findAllAdmin(@Query() pagination?: PaginationDto) {
    return this.vouchersService.findAll(pagination, { includeInactive: true });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('seller/mine')
  @Roles('ROLE_SELLER')
  findSellerVouchers(
    @Request() req: AuthenticatedRequest,
    @Query() pagination?: PaginationDto,
  ) {
    return this.vouchersService.findAllForSeller(req.user.id, pagination);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('seller')
  @Roles('ROLE_SELLER')
  createSellerVoucher(
    @Request() req: AuthenticatedRequest,
    @Body() createVoucherDto: CreateVoucherDto,
  ) {
    return this.vouchersService.createForSeller(req.user.id, createVoucherDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('seller/:id')
  @Roles('ROLE_SELLER')
  updateSellerVoucher(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateVoucherDto: UpdateVoucherDto,
  ) {
    return this.vouchersService.updateForSeller(
      req.user.id,
      id,
      updateVoucherDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('seller/:id')
  @Roles('ROLE_SELLER')
  removeSellerVoucher(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.vouchersService.removeForSeller(req.user.id, id);
  }

  @Get('seller/:sellerId/public')
  findPublicSellerVouchers(
    @Param('sellerId') sellerId: string,
    @Query() pagination?: PaginationDto,
  ) {
    return this.vouchersService.findPublicForSeller(sellerId, pagination);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.vouchersService.findByCode(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.vouchersService.findOne(id, {
      includeInactive: req.user.roles.includes('ROLE_ADMIN'),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles('ROLE_ADMIN')
  create(@Body() createVoucherDto: CreateVoucherDto) {
    return this.vouchersService.create(createVoucherDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles('ROLE_ADMIN')
  update(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto) {
    return this.vouchersService.update(id, updateVoucherDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles('ROLE_ADMIN')
  remove(@Param('id') id: string) {
    return this.vouchersService.remove(id);
  }
}
