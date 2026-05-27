import { IsInt, Min, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CartItemPersonalizationDto } from './add-to-cart.dto';

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CartItemPersonalizationDto)
  personalization?: CartItemPersonalizationDto;
}
