import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CreateGiftWrapTierDto } from './dto/create-gift-wrap-tier.dto';
import { UpdateGiftWrapTierDto } from './dto/update-gift-wrap-tier.dto';
import { GiftWrapTiersService } from './gift-wrap-tiers.service';

@Controller('gift-wrap-tiers')
export class GiftWrapTiersController {
  constructor(private readonly giftWrapTiersService: GiftWrapTiersService) {}

  @Get()
  findPublic() {
    return this.giftWrapTiersService.findPublic();
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/gift-wrap-tiers')
export class AdminGiftWrapTiersController {
  constructor(private readonly giftWrapTiersService: GiftWrapTiersService) {}

  @Get()
  @Roles('ROLE_ADMIN')
  listAdmin() {
    return this.giftWrapTiersService.listAdmin();
  }

  @Post()
  @Roles('ROLE_ADMIN')
  create(@Body() dto: CreateGiftWrapTierDto) {
    return this.giftWrapTiersService.create(dto);
  }

  @Patch(':id')
  @Roles('ROLE_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateGiftWrapTierDto) {
    return this.giftWrapTiersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ROLE_ADMIN')
  remove(@Param('id') id: string) {
    return this.giftWrapTiersService.remove(id);
  }
}
