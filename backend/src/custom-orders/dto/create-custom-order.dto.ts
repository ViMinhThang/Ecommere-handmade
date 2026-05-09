import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomOrderDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  artisanNote?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price: number;

  @IsOptional()
  @IsString()
  leadTime?: string;

  @IsOptional()
  @IsArray()
  specifications?: unknown[];

  @IsOptional()
  @IsString()
  sketchImageUrl?: string;
}
