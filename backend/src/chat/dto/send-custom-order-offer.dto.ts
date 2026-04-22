import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendCustomOrderOfferDto {
  @IsUUID()
  @IsNotEmpty()
  customOrderId: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
