import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRefundDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subOrderId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
