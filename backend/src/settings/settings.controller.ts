import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('platform')
  getPlatformSettings() {
    return this.settingsService.getPlatformSettings();
  }

  @Patch('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  updatePlatformSettings(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdatePlatformSettingsDto,
  ) {
    return this.settingsService.updatePlatformSettings(dto, req.user.id);
  }
}
