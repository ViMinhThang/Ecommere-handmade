import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
export declare class CategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createCategoryDto: CreateCategoryDto): Promise<{
        image: string | null;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string | null;
        description: string | null;
        productsCount: number;
    }>;
    private generateSlug;
    findAll(status?: string, pagination?: PaginationDto): Promise<{
        data: {
            image: string | null;
            status: import(".prisma/client").$Enums.CategoryStatus;
            id: string;
            name: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            slug: string | null;
            description: string | null;
            productsCount: number;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        image: string | null;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string | null;
        description: string | null;
        productsCount: number;
    }>;
    findBySlug(slug: string): Promise<{
        image: string | null;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string | null;
        description: string | null;
        productsCount: number;
    }>;
    update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<{
        image: string | null;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string | null;
        description: string | null;
        productsCount: number;
    }>;
    remove(id: string): Promise<{
        image: string | null;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string | null;
        description: string | null;
        productsCount: number;
    }>;
    getStats(): Promise<{
        total: number;
        active: number;
        inactive: number;
    }>;
    incrementProductsCount(categoryId: string): Promise<void>;
    decrementProductsCount(categoryId: string): Promise<void>;
}
