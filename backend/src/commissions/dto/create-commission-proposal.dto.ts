import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommissionProposalDto {
  @IsString()
  @MinLength(10)
  message: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  proposedPrice: number;

  @IsString()
  @MinLength(1)
  proposedLeadTime: string;

  @IsOptional()
  @IsString()
  sketchImageUrl?: string;
}
