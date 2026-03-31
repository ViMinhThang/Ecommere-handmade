import { IsNumber, IsEnum } from 'class-validator';
import { InventoryChangeReason } from '@prisma/client';

export { InventoryChangeReason };

export class UpdateStockDto {
  @IsNumber()
  quantity: number;

  @IsEnum(InventoryChangeReason)
  reason: InventoryChangeReason;
}
