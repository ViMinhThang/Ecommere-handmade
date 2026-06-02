import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductImageDto } from './create-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  descriptionImages?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  personalizationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  personalizationRequired?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  personalizationInstructions?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  personalizationMaxLength?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionColors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionMaterials?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionSizes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  processingTime?: string;

  @IsOptional()
  @IsString()
  shippingProfileId?: string;
}
