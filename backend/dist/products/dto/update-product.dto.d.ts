export declare class UpdateProductDto {
    name?: string;
    description?: string;
    descriptionImages?: string[];
    images?: {
        url: string;
        isMain: boolean;
    }[];
    price?: number;
    categoryId?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    stock?: number;
    lowStockThreshold?: number;
    sku?: string;
}
