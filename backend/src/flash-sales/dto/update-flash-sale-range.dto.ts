import { IsOptional, IsString } from 'class-validator';
import { CreateFlashSaleRangeDto } from './create-flash-sale-range.dto';

export class UpdateFlashSaleRangeDto extends CreateFlashSaleRangeDto {
  @IsString()
  @IsOptional()
  id?: string;
}
