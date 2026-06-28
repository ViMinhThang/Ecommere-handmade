import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { AdminAdjustRewardPointsDto } from './dto/admin-adjust-reward-points.dto';
import { RewardsService } from './rewards.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('balance')
  getBalance(@Request() req: AuthenticatedRequest) {
    return this.rewardsService.getBalance(req.user.id);
  }

  @Get('ledger')
  getLedger(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rewardsService.getLedger(
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  @Get('admin/summary')
  @Roles('ROLE_ADMIN')
  getAdminSummary() {
    return this.rewardsService.getAdminSummary();
  }

  @Get('admin/users')
  @Roles('ROLE_ADMIN')
  getAdminUsers(
    @Query('q') query?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rewardsService.getAdminUsers(
      query,
      Number(page),
      Number(limit),
    );
  }

  @Get('admin/users/:userId/ledger')
  @Roles('ROLE_ADMIN')
  getAdminUserLedger(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rewardsService.getAdminUserLedger(
      userId,
      Number(page),
      Number(limit),
    );
  }

  @Post('admin/users/:userId/adjustments')
  @Roles('ROLE_ADMIN')
  adjustUserPoints(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: AdminAdjustRewardPointsDto,
  ) {
    return this.rewardsService.adminAdjustPoints(
      req.user.id,
      userId,
      dto.points,
      dto.reason,
    );
  }
}
