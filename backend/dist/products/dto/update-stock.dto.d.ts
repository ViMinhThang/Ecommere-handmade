import { InventoryChangeReason } from '@prisma/client';
export { InventoryChangeReason };
export declare class UpdateStockDto {
    quantity: number;
    reason: InventoryChangeReason;
}
