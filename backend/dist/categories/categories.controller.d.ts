import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(query: ListCategoriesQueryDto): Promise<{
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
    getStats(): Promise<{
        total: number;
        active: number;
        inactive: number;
    }>;
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
}
