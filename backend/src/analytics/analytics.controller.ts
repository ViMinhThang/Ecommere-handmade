import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('seller/revenue-over-time')
  async getRevenueOverTime(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getSellerRevenueOverTime(req.user.id, startDate, endDate);
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller/revenue-by-category')
  async getRevenueByCategory(
    @Req() req: any,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.analyticsService.getSellerRevenueByCategory(
      req.user.id,
      parseInt(month, 10),
      parseInt(year, 10),
    );
  }
}
