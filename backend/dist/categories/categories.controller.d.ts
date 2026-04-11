import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(query: ListCategoriesQueryDto): Promise<{
        data: {
            status: import(".prisma/client").$Enums.CategoryStatus;
            id: string;
            name: string;
            description: string | null;
            image: string | null;
            slug: string | null;
            productsCount: number;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        description: string | null;
        image: string | null;
        slug: string | null;
        productsCount: number;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findBySlug(slug: string): Promise<{
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        description: string | null;
        image: string | null;
        slug: string | null;
        productsCount: number;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findOne(id: string): Promise<{
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        description: string | null;
        image: string | null;
        slug: string | null;
        productsCount: number;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<{
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        description: string | null;
        image: string | null;
        slug: string | null;
        productsCount: number;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        name: string;
        description: string | null;
        image: string | null;
        slug: string | null;
        productsCount: number;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
