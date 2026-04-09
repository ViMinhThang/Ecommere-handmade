import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { Request as ExpressRequest } from 'express';
interface AuthenticatedRequest extends ExpressRequest {
    user: {
        id: string;
        email: string;
        roles: string[];
    };
}
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    uploadImage(file: Express.Multer.File): Promise<{
        url: string;
        fileName: string;
    }>;
    create(req: AuthenticatedRequest, createProductDto: CreateProductDto): Promise<{
        category: {
            image: string | null;
            status: import(".prisma/client").$Enums.CategoryStatus;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            productsCount: number;
        };
        images: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            url: string;
            isMain: boolean;
            productId: string;
        }[];
        seller: {
            status: import(".prisma/client").$Enums.UserStatus;
            name: string;
            email: string;
            password: string;
            roles: import(".prisma/client").$Enums.Role[];
            avatar: string | null;
            phone: string | null;
            shopName: string | null;
            id: string;
            otpCode: string | null;
            otpExpires: Date | null;
            isEmailVerified: boolean;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        descriptionImages: string[];
        categoryId: string;
        stock: number;
        lowStockThreshold: number;
        sku: string | null;
        sellerId: string;
    }>;
    findAll(query: ListProductsQueryDto): Promise<{
        data: {
            category: {
                name: string;
                id: string;
            };
            status: import(".prisma/client").$Enums.ProductStatus;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            images: {
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                url: string;
                isMain: boolean;
                productId: string;
            }[];
            categoryId: string;
            stock: number;
            sku: string | null;
            seller: {
                name: string;
                shopName: string | null;
                id: string;
            };
            sellerId: string;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getStats(): Promise<{
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    }>;
    getBySeller(sellerId: string): Promise<({
        category: {
            image: string | null;
            status: import(".prisma/client").$Enums.CategoryStatus;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            productsCount: number;
        };
        images: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            url: string;
            isMain: boolean;
            productId: string;
        }[];
    } & {
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        descriptionImages: string[];
        categoryId: string;
        stock: number;
        lowStockThreshold: number;
        sku: string | null;
        sellerId: string;
    })[]>;
    getLowStock(sellerId?: string): Promise<({
        category: {
            image: string | null;
            status: import(".prisma/client").$Enums.CategoryStatus;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            productsCount: number;
        };
        seller: {
            status: import(".prisma/client").$Enums.UserStatus;
            name: string;
            email: string;
            password: string;
            roles: import(".prisma/client").$Enums.Role[];
            avatar: string | null;
            phone: string | null;
            shopName: string | null;
            id: string;
            otpCode: string | null;
            otpExpires: Date | null;
            isEmailVerified: boolean;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        descriptionImages: string[];
        categoryId: string;
        stock: number;
        lowStockThreshold: number;
        sku: string | null;
        sellerId: string;
    })[]>;
    findOne(id: string): Promise<{
        category: {
            image: string | null;
            status: import(".prisma/client").$Enums.CategoryStatus;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            productsCount: number;
        };
        images: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            url: string;
            isMain: boolean;
            productId: string;
        }[];
        seller: {
            status: import(".prisma/client").$Enums.UserStatus;
            name: string;
            email: string;
            password: string;
            roles: import(".prisma/client").$Enums.Role[];
            avatar: string | null;
            phone: string | null;
            shopName: string | null;
            id: string;
            otpCode: string | null;
            otpExpires: Date | null;
            isEmailVerified: boolean;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        descriptionImages: string[];
        categoryId: string;
        stock: number;
        lowStockThreshold: number;
        sku: string | null;
        sellerId: string;
    }>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<({
        category: {
            image: string | null;
            status: import(".prisma/client").$Enums.CategoryStatus;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            productsCount: number;
        };
        images: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            url: string;
            isMain: boolean;
            productId: string;
        }[];
        seller: {
            status: import(".prisma/client").$Enums.UserStatus;
            name: string;
            email: string;
            password: string;
            roles: import(".prisma/client").$Enums.Role[];
            avatar: string | null;
            phone: string | null;
            shopName: string | null;
            id: string;
            otpCode: string | null;
            otpExpires: Date | null;
            isEmailVerified: boolean;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        descriptionImages: string[];
        categoryId: string;
        stock: number;
        lowStockThreshold: number;
        sku: string | null;
        sellerId: string;
    }) | null>;
    remove(id: string): Promise<{
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        descriptionImages: string[];
        categoryId: string;
        stock: number;
        lowStockThreshold: number;
        sku: string | null;
        sellerId: string;
    }>;
    getInventory(id: string): Promise<{
        name: string;
        id: string;
        stock: number;
        lowStockThreshold: number;
        sku: string | null;
    }>;
    updateStock(id: string, updateStockDto: UpdateStockDto): Promise<{
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        descriptionImages: string[];
        categoryId: string;
        stock: number;
        lowStockThreshold: number;
        sku: string | null;
        sellerId: string;
    }>;
    getInventoryLog(id: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        reason: import(".prisma/client").$Enums.InventoryChangeReason;
        productId: string;
        change: number;
    }[]>;
}
export {};
