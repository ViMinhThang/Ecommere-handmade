import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmCustomOrderPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
