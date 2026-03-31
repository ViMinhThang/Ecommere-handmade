import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVoucherRangeDto } from './create-voucher-range.dto';

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVoucherRangeDto)
  @IsOptional()
  ranges?: CreateVoucherRangeDto[];
}
