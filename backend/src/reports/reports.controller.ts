import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReportStatus, ReportType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createReportDto: CreateReportDto,
  ) {
    return this.reportsService.create(
      req.user.id,
      req.user.roles,
      createReportDto,
    );
  }

  @Get('my')
  findMine(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.findMine(req.user.id, Number(page), Number(limit));
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private parseReportStatus(value?: string) {
    if (!value) return undefined;
    if (!Object.values(ReportStatus).includes(value as ReportStatus)) {
      throw new BadRequestException('Invalid report status');
    }
    return value as ReportStatus;
  }

  private parseReportType(value?: string) {
    if (!value) return undefined;
    if (!Object.values(ReportType).includes(value as ReportType)) {
      throw new BadRequestException('Invalid report type');
    }
    return value as ReportType;
  }

  @Get()
  @Roles('ROLE_ADMIN')
  findAdmin(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.findAdmin({
      status: this.parseReportStatus(status),
      type: this.parseReportType(type),
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Patch(':id/status')
  @Roles('ROLE_ADMIN')
  updateStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReportStatusDto,
  ) {
    return this.reportsService.updateStatus(id, req.user.id, updateStatusDto);
  }
}
