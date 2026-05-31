import { IsString, MinLength, MaxLength } from 'class-validator';

export class SellerReplyCustomOrderReviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reply: string;
}
