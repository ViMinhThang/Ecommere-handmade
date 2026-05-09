import { IsEnum } from 'class-validator';
import { CustomOrderStatus } from '@prisma/client';

export class UpdateCustomOrderStatusDto {
  @IsEnum(CustomOrderStatus)
  status: CustomOrderStatus;
}
