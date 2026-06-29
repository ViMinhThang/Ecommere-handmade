import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveCustomOrderPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  voucherCode?: string;
}
