import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCustomOrderQuoteTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  materials?: unknown;

  @IsOptional()
  sizeOptions?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  estimatedLeadTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  revisionPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shippingNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  termsNote?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
