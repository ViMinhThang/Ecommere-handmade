import { IsOptional, IsString } from 'class-validator';
import { CreateVoucherRangeDto } from './create-voucher-range.dto';

export class UpdateVoucherRangeDto extends CreateVoucherRangeDto {
  @IsString()
  @IsOptional()
  id?: string;
}
