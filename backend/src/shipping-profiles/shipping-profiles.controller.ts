import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { CreateShippingProfileDto } from './dto/create-shipping-profile.dto';
import { UpdateShippingProfileDto } from './dto/update-shipping-profile.dto';
import { ShippingProfilesService } from './shipping-profiles.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_SELLER')
@Controller('shipping-profiles')
export class ShippingProfilesController {
  constructor(
    private readonly shippingProfilesService: ShippingProfilesService,
  ) {}

  @Get('me')
  listMine(@Request() req: AuthenticatedRequest) {
    return this.shippingProfilesService.listMine(req.user.id);
  }

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateShippingProfileDto,
  ) {
    return this.shippingProfilesService.create(req.user.id, dto);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateShippingProfileDto,
  ) {
    return this.shippingProfilesService.update(req.user.id, id, dto);
  }

  @Patch(':id/default')
  setDefault(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.shippingProfilesService.setDefault(req.user.id, id);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.shippingProfilesService.remove(req.user.id, id);
  }
}
