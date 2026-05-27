import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVoucherRangeDto } from './create-voucher-range.dto';

export class CreateVoucherDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  code: string;

  @IsString()
  categoryId: string;

  @IsString()
  @IsOptional()
  sellerId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxDiscountAmount?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  usageLimit?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  perUserLimit?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVoucherRangeDto)
  ranges: CreateVoucherRangeDto[];
}
