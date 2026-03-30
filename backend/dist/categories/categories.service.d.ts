import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createCategoryDto: CreateCategoryDto): Promise<{
        image: string | null;
        name: string;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        productsCount: number;
    }>;
    findAll(status?: string): Promise<{
        image: string | null;
        name: string;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        productsCount: number;
    }[]>;
    findOne(id: string): Promise<{
        image: string | null;
        name: string;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        productsCount: number;
    }>;
    update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<{
        image: string | null;
        name: string;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        productsCount: number;
    }>;
    remove(id: string): Promise<{
        image: string | null;
        name: string;
        status: import(".prisma/client").$Enums.CategoryStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        productsCount: number;
    }>;
    getStats(): Promise<{
        total: number;
        active: number;
        inactive: number;
    }>;
}
