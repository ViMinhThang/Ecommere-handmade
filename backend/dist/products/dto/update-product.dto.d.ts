export declare class UpdateProductDto {
    name?: string;
    description?: string;
    price?: number;
    categoryId?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
