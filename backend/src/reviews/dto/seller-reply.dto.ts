import { IsString, MaxLength, MinLength } from 'class-validator';

export class SellerReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reply: string;
}
