import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateVoucherRangeDto } from './update-voucher-range.dto';

export class UpdateVoucherDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxDiscountAmount?: number | null;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  usageLimit?: number | null;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  perUserLimit?: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVoucherRangeDto)
  @IsOptional()
  ranges?: UpdateVoucherRangeDto[];
}
