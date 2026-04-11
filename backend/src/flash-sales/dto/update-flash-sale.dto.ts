import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFlashSaleRangeDto)
  @IsOptional()
  ranges?: UpdateFlashSaleRangeDto[];
}
