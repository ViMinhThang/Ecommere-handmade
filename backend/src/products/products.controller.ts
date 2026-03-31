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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(req.user.id, createProductDto);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sellerId') sellerId?: string,
    @Query() pagination?: PaginationDto,
  ) {
    return this.productsService.findAll(
      status,
      categoryId,
      sellerId,
      pagination,
    );
  }

  @Get('stats')
  getStats() {
    return this.productsService.getStats();
  }

  @Get('seller/:sellerId')
  getBySeller(@Param('sellerId') sellerId: string) {
    return this.productsService.getBySeller(sellerId);
  }

  @Get('low-stock')
  getLowStock(@Query('sellerId') sellerId?: string) {
    return this.productsService.getLowStockProducts(sellerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get(':id/inventory')
  getInventory(@Param('id') id: string) {
    return this.productsService.getInventory(id);
  }

  @Patch(':id/stock')
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  updateStock(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.productsService.updateStock(id, updateStockDto);
  }

  @Get(':id/inventory-log')
  getInventoryLog(@Param('id') id: string) {
    return this.productsService.getInventoryLog(id);
  }
}
