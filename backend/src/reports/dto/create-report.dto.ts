import { ReportType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  targetProductId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
