import { IsNumber, IsDateString } from 'class-validator';

export class PriceRangeDto {
  @IsNumber()
  minPrice: number;

  @IsNumber()
  maxPrice: number;

  @IsNumber()
  discountPercent: number;

  @IsDateString()
  endDate: string;
}
