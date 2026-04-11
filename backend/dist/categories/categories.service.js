"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CategoriesService = class CategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createCategoryDto) {
        const { slug, ...rest } = createCategoryDto;
        const generatedSlug = slug || this.generateSlug(createCategoryDto.name);
        return this.prisma.category.create({
            data: {
                ...rest,
                slug: generatedSlug,
            },
        });
    }
    generateSlug(name) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    async findAll(status, pagination) {
        const where = {};
        if (status)
            where.status = status.toUpperCase();
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 20;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.category.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.category.count({ where }),
        ]);
        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID ${id} not found`);
        }
        return category;
    }
    async findBySlug(slug) {
        const category = await this.prisma.category.findUnique({
            where: { slug },
        });
        if (!category) {
            try {
                return await this.findOne(slug);
            }
            catch (e) {
                throw new common_1.NotFoundException(`Category with slug or ID ${slug} not found`);
            }
        }
        return category;
    }
    async update(id, updateCategoryDto) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID ${id} not found`);
        }
        const { slug, name, ...rest } = updateCategoryDto;
        const data = { ...rest };
        if (slug !== undefined) {
            data.slug = slug;
        }
        else if (name && !category.slug) {
            data.slug = this.generateSlug(name);
        }
        return this.prisma.category.update({
            where: { id },
            data,
        });
    }
    async remove(id) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID ${id} not found`);
        }
        return this.prisma.category.delete({ where: { id } });
    }
    async getStats() {
        const total = await this.prisma.category.count();
        const active = await this.prisma.category.count({
            where: { status: 'ACTIVE' },
        });
        const inactive = await this.prisma.category.count({
            where: { status: 'INACTIVE' },
        });
        return { total, active, inactive };
    }
    async incrementProductsCount(categoryId) {
        await this.prisma.category.update({
            where: { id: categoryId },
            data: { productsCount: { increment: 1 } },
        });
    }
    async decrementProductsCount(categoryId) {
        await this.prisma.category.update({
            where: { id: categoryId },
            data: { productsCount: { decrement: 1 } },
        });
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map