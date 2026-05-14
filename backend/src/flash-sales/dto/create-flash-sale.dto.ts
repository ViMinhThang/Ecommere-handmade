import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FlashSaleState } from '@prisma/client';
import { CreateFlashSaleRangeDto } from './create-flash-sale-range.dto';

export class CreateFlashSaleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  banner?: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(FlashSaleState)
  @IsOptional()
  saleState?: FlashSaleState;

  @IsString()
  @IsOptional()
  pausedReason?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUnits?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  perUserLimit?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  reserveStock?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  autoPauseThreshold?: number;

  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFlashSaleRangeDto)
  ranges: CreateFlashSaleRangeDto[];
}
