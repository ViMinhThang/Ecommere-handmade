import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SendCustomOrderQuoteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  templateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  leadTime?: string;

  @IsOptional()
  materials?: unknown;

  @IsOptional()
  sizeOptions?: unknown;

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
  @IsString()
  @MaxLength(2000)
  message?: string;
}
