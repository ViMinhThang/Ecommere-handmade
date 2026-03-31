export declare enum InventoryChangeReason {
    ORDER = "ORDER",
    MANUAL = "MANUAL",
    RESTOCK = "RESTOCK",
    RETURN = "RETURN"
}
export declare class UpdateStockDto {
    quantity: number;
    reason: InventoryChangeReason;
}
