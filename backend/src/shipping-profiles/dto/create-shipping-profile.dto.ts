import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShippingProfileDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsString()
  @MaxLength(80)
  carrierName: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  trackingUrlTemplate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  processingMinDays: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  processingMaxDays: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  transitMinDays: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  transitMaxDays: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
