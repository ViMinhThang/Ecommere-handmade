import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FlashSaleState } from '@prisma/client';
import { UpdateFlashSaleRangeDto } from './update-flash-sale-range.dto';

export class UpdateFlashSaleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  banner?: string;

  @IsDateString()
  @IsOptional()
  startAt?: string;

  @IsDateString()
  @IsOptional()
  endAt?: string;

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
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFlashSaleRangeDto)
  @IsOptional()
  ranges?: UpdateFlashSaleRangeDto[];
}
