import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FlashSalesService } from './flash-sales.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Get()
  findAll() {
    return this.flashSalesService.findAll();
  }

  @Get('active')
  findActive() {
    return this.flashSalesService.findActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all')
  @Roles('ROLE_ADMIN')
  findAllAdmin() {
    return this.flashSalesService.findAll({ includeInactive: true });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.flashSalesService.findOne(id, {
      includeInactive: req.user.roles.includes('ROLE_ADMIN'),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles('ROLE_ADMIN')
  create(@Body() createFlashSaleDto: CreateFlashSaleDto) {
    return this.flashSalesService.create(createFlashSaleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles('ROLE_ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateFlashSaleDto: UpdateFlashSaleDto,
  ) {
    return this.flashSalesService.update(id, updateFlashSaleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles('ROLE_ADMIN')
  remove(@Param('id') id: string) {
    return this.flashSalesService.remove(id);
  }
}
