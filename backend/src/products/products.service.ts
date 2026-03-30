import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const { images, ...productData } = createProductDto;
    
    return this.prisma.product.create({
      data: {
        ...productData,
        images: {
          create: images,
        },
      },
      include: {
        category: true,
        seller: true,
        images: true,
      },
    });
  }

  async findAll(status?: string, categoryId?: string, sellerId?: string) {
    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (categoryId) where.categoryId = categoryId;
    if (sellerId) where.sellerId = sellerId;

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        seller: true,
        images: true,
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        seller: true,
        images: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: true,
        seller: true,
        images: true,
      },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.prisma.product.delete({ where: { id } });
  }

  async getStats() {
    const total = await this.prisma.product.count();
    const pending = await this.prisma.product.count({ where: { status: 'PENDING' } });
    const approved = await this.prisma.product.count({ where: { status: 'APPROVED' } });
    const rejected = await this.prisma.product.count({ where: { status: 'REJECTED' } });

    return { total, pending, approved, rejected };
  }

  async getBySeller(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      include: {
        category: true,
        images: true,
      },
    });
  }
}
