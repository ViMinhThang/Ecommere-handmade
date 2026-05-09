import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { slug, ...rest } = createCategoryDto;
    const generatedSlug = slug || this.generateSlug(createCategoryDto.name);

    return this.prisma.category.create({
      data: {
        ...rest,
        slug: generatedSlug,
      },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll(status?: string, pagination?: PaginationDto) {
    const where: {
      status?: 'ACTIVE' | 'INACTIVE';
    } = {};
    if (status) where.status = status.toUpperCase() as 'ACTIVE' | 'INACTIVE';

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

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (!category) {
      try {
        return await this.findOne(slug);
      } catch {
        throw new NotFoundException(
          `Category with slug or ID ${slug} not found`,
        );
      }
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const { slug, name, ...rest } = updateCategoryDto;
    const data: Prisma.CategoryUpdateInput = { ...rest };

    if (slug !== undefined) {
      data.slug = slug;
    } else if (name && !category.slug) {
      data.slug = this.generateSlug(name);
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
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

  async incrementProductsCount(categoryId: string) {
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { productsCount: { increment: 1 } },
    });
  }

  async decrementProductsCount(categoryId: string) {
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { productsCount: { decrement: 1 } },
    });
  }
}
