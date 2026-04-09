import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { promises as fs } from 'fs';
import * as path from 'path';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto, InventoryChangeReason } from './dto/update-stock.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng cung cấp file ảnh');
    }
    const uploadPath = path.join('uploads', 'products');
    await fs.mkdir(uploadPath, { recursive: true });

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = path.join(uploadPath, fileName);
    await fs.writeFile(filePath, file.buffer);

    return {
      url: `products/${fileName}`,
      fileName: fileName
    };
  }

  async create(sellerId: string, createProductDto: CreateProductDto) {
    const { images, ...productData } = createProductDto;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          sellerId,
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

      await tx.category.update({
        where: { id: product.categoryId },
        data: { productsCount: { increment: 1 } },
      });

      return product;
    });
  }

  async findAll(
    status?: string,
    categoryId?: string,
    sellerId?: string,
    pagination?: PaginationDto,
  ) {
    const where: {
      status?: 'PENDING' | 'APPROVED' | 'REJECTED';
      categoryId?: string;
      sellerId?: string;
    } = {};
    if (status)
      where.status = status.toUpperCase() as
        | 'PENDING'
        | 'APPROVED'
        | 'REJECTED';
    if (categoryId) where.categoryId = categoryId;
    if (sellerId) where.sellerId = sellerId;

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          price: true,
          status: true,
          stock: true,
          categoryId: true,
          sellerId: true,
          sku: true,
          createdAt: true,
          updatedAt: true,
          images: { where: { isMain: true }, take: 1 },
          category: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true, shopName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
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
    const { images, ...productData } = updateProductDto;

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // If images are provided, replace them
      if (images) {
        await tx.productImage.deleteMany({
          where: { productId: id },
        });

        await tx.product.update({
          where: { id },
          data: {
            ...productData,
            images: {
              create: images,
            },
          },
        });
      } else {
        await tx.product.update({
          where: { id },
          data: productData,
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          seller: true,
          images: true,
        },
      });
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id: product.categoryId },
        data: { productsCount: { decrement: 1 } },
      });
      return tx.product.delete({ where: { id } });
    });
  }

  async getStats() {
    const total = await this.prisma.product.count();
    const pending = await this.prisma.product.count({
      where: { status: 'PENDING' },
    });
    const approved = await this.prisma.product.count({
      where: { status: 'APPROVED' },
    });
    const rejected = await this.prisma.product.count({
      where: { status: 'REJECTED' },
    });

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

  async getInventory(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        stock: true,
        lowStockThreshold: true,
        sku: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    return product;
  }

  async updateStock(productId: string, updateStockDto: UpdateStockDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const updatedProduct = await this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id: productId } });
      if (!current) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const newStock = current.stock + updateStockDto.quantity;
      if (newStock < 0) {
        throw new BadRequestException('Insufficient stock');
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: updateStockDto.quantity } },
      });

      await tx.inventoryLog.create({
        data: {
          productId,
          change: updateStockDto.quantity,
          reason: updateStockDto.reason,
        },
      });

      return updated;
    });

    return updatedProduct;
  }

  async getInventoryLog(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.prisma.inventoryLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deductStock(productId: string, quantity: number) {
    return this.updateStock(productId, {
      quantity: -quantity,
      reason: InventoryChangeReason.ORDER,
    });
  }

  async getLowStockProducts(sellerId?: string) {
    const products = await this.prisma.product.findMany({
      where: sellerId ? { sellerId } : {},
      include: {
        category: true,
        seller: true,
      },
      orderBy: {
        stock: 'asc',
      },
    });

    return products.filter((p) => p.stock <= p.lowStockThreshold);
  }
}
