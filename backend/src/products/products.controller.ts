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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('upload')
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.productsService.uploadImage(file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(req.user.id, createProductDto);
  }

  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(
      query.status,
      query.categoryId,
      query.sellerId,
      query,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('stats')
  getStats() {
    return this.productsService.getStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('seller/:sellerId')
  getBySeller(@Param('sellerId') sellerId: string) {
    return this.productsService.getBySeller(sellerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('low-stock')
  getLowStock(@Query('sellerId') sellerId?: string) {
    return this.productsService.getLowStockProducts(sellerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(
      id,
      updateProductDto,
      req.user.id,
      req.user.roles,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.productsService.remove(id, req.user.id, req.user.roles);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/inventory')
  getInventory(@Param('id') id: string) {
    return this.productsService.getInventory(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/stock')
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  updateStock(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.productsService.updateStock(id, updateStockDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/inventory-log')
  getInventoryLog(@Param('id') id: string) {
    return this.productsService.getInventoryLog(id);
  }

  @Post(':id/view')
  incrementViewCount(@Param('id') id: string) {
    return this.productsService.incrementViewCount(id);
  }
}
