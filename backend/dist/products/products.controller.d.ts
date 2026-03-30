import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(createProductDto: CreateProductDto): Promise<{
        category: {
            image: string | null;
            name: string;
            status: import(".prisma/client").$Enums.CategoryStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            productsCount: number;
        };
        images: {
            id: string;
            createdAt: Date;
            url: string;
            isMain: boolean;
            productId: string;
        }[];
        seller: {
            image: string | null;
            name: string;
            email: string;
            password: string;
            roles: import(".prisma/client").$Enums.Role[];
            status: import(".prisma/client").$Enums.UserStatus;
            avatar: string | null;
            phone: string | null;
            shopName: string | null;
            id: string;
            ordersCount: number;
            totalSpent: number;
            products: number;
            sales: number;
            rating: number;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: number;
        categoryId: string;
        sellerId: string;
    }>;
    findAll(status?: string, categoryId?: string, sellerId?: string): Promise<({
        category: {
            image: string | null;
            name: string;
            status: import(".prisma/client").$Enums.CategoryStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            productsCount: number;
        };
        images: {
            id: string;
            createdAt: Date;
            url: string;
            isMain: boolean;
            productId: string;
        }[];
        seller: {
            image: string | null;
            name: string;
            email: string;
            password: string;
            roles: import(".prisma/client").$Enums.Role[];
            status: import(".prisma/client").$Enums.UserStatus;
            avatar: string | null;
            phone: string | null;
            shopName: string | null;
            id: string;
            ordersCount: number;
            totalSpent: number;
            products: number;
            sales: number;
            rating: number;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: number;
        categoryId: string;
        sellerId: string;
    })[]>;
    getStats(): Promise<{
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    }>;
    getBySeller(sellerId: string): Promise<({
        category: {
            image: string | null;
            name: string;
            status: import(".prisma/client").$Enums.CategoryStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            productsCount: number;
        };
        images: {
            id: string;
            createdAt: Date;
            url: string;
            isMain: boolean;
            productId: string;
        }[];
    } & {
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: number;
        categoryId: string;
        sellerId: string;
    })[]>;
    findOne(id: string): Promise<{
        category: {
            image: string | null;
            name: string;
            status: import(".prisma/client").$Enums.CategoryStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            productsCount: number;
        };
        images: {
            id: string;
            createdAt: Date;
            url: string;
            isMain: boolean;
            productId: string;
        }[];
        seller: {
            image: string | null;
            name: string;
            email: string;
            password: string;
            roles: import(".prisma/client").$Enums.Role[];
            status: import(".prisma/client").$Enums.UserStatus;
            avatar: string | null;
            phone: string | null;
            shopName: string | null;
            id: string;
            ordersCount: number;
            totalSpent: number;
            products: number;
            sales: number;
            rating: number;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: number;
        categoryId: string;
        sellerId: string;
    }>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<{
        category: {
            image: string | null;
            name: string;
            status: import(".prisma/client").$Enums.CategoryStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            productsCount: number;
        };
        images: {
            id: string;
            createdAt: Date;
            url: string;
            isMain: boolean;
            productId: string;
        }[];
        seller: {
            image: string | null;
            name: string;
            email: string;
            password: string;
            roles: import(".prisma/client").$Enums.Role[];
            status: import(".prisma/client").$Enums.UserStatus;
            avatar: string | null;
            phone: string | null;
            shopName: string | null;
            id: string;
            ordersCount: number;
            totalSpent: number;
            products: number;
            sales: number;
            rating: number;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: number;
        categoryId: string;
        sellerId: string;
    }>;
    remove(id: string): Promise<{
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: number;
        categoryId: string;
        sellerId: string;
    }>;
}
