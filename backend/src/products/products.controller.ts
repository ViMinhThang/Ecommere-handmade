import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.productsService.findAll(status, categoryId, sellerId);
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
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get(':id/inventory')
  getInventory(@Param('id') id: string) {
    return this.productsService.getInventory(id);
  }

  @Patch(':id/stock')
  updateStock(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.productsService.updateStock(id, updateStockDto);
  }

  @Get(':id/inventory-log')
  getInventoryLog(@Param('id') id: string) {
    return this.productsService.getInventoryLog(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.productsService.updateStatus(id, 'APPROVED');
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.productsService.updateStatus(id, 'REJECTED');
  }
}
