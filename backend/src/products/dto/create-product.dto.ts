import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductImageDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  descriptionImages?: string[];

  @IsString()
  categoryId: string;

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
