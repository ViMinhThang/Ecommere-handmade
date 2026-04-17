import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StartConversationDto {
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productId?: string;
}
