import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFlashSaleRangeDto)
  ranges: CreateFlashSaleRangeDto[];
}
