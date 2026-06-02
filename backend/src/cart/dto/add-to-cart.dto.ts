import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemPersonalizationDto {
  @IsOptional()
  @IsString()
  text?: string;
}

export class CartItemSelectedOptionsDto {
  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  processingTime?: string;
}

export class AddToCartDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number = 1;

  @IsOptional()
  @ValidateNested()
  @Type(() => CartItemPersonalizationDto)
  personalization?: CartItemPersonalizationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CartItemSelectedOptionsDto)
  selectedOptions?: CartItemSelectedOptionsDto;
}
