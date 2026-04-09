export declare class ProductImageDto {
    url: string;
    isMain?: boolean;
}
export declare class CreateProductDto {
    name: string;
    description: string;
    price: number;
    images?: ProductImageDto[];
    descriptionImages?: string[];
    categoryId: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    stock?: number;
    lowStockThreshold?: number;
    sku?: string;
}
