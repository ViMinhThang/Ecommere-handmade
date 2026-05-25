import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CustomOrderStatus } from '@prisma/client';

export class CreateCustomOrderProgressEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(CustomOrderStatus)
  status?: CustomOrderStatus;
}
