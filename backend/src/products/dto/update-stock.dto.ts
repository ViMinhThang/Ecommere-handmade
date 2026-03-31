import { IsNumber, IsEnum, IsOptional } from 'class-validator';

export enum InventoryChangeReason {
  ORDER = 'ORDER',
  MANUAL = 'MANUAL',
  RESTOCK = 'RESTOCK',
  RETURN = 'RETURN',
}

export class UpdateStockDto {
  @IsNumber()
  quantity: number;

  @IsEnum(InventoryChangeReason)
  reason: InventoryChangeReason;
}
