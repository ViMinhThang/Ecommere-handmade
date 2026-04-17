import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyVoucherDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
