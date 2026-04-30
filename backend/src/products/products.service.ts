import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { promises as fs } from 'fs';
import * as path from 'path';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto, InventoryChangeReason } from './dto/update-stock.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { FlashSalesService } from '../flash-sales/flash-sales.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private flashSalesService: FlashSalesService,
  ) {}

  private normalizeFeaturedLimit(limit?: number) {
    if (!limit || !Number.isFinite(limit)) {
      return 10;
    }

    return Math.min(Math.max(Math.floor(limit), 1), 50);
  }

  private isAdmin(userRoles: string[]) {
    return userRoles.includes('ROLE_ADMIN');
  }

  private async assertProductOwnership(
    productId: string,
    userId: string,
    userRoles: string[],
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sellerId: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (!this.isAdmin(userRoles) && product.sellerId !== userId) {
      throw new ForbiddenException(
        'You can only access products that belong to your shop',
      );
    }

    return product;
  }

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng cung cấp file ảnh');
    }

    const aloudMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!aloudMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Chỉ chấp nhận các loại file ảnh (jpeg, png, webp, gif)',
      );
    }

    const uploadPath = path.join('uploads', 'products');
    await fs.mkdir(uploadPath, { recursive: true });

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = path.join(uploadPath, fileName);
    await fs.writeFile(filePath, file.buffer);

    return {
      url: `products/${fileName}`,
      fileName: fileName,
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
    query?: ListProductsQueryDto,
  ) {
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    // Basic filters
    if (status) where.status = status.toUpperCase() as any;
    if (categoryId) where.categoryId = categoryId;
    if (sellerId) where.sellerId = sellerId;

    // Advanced filters from query DTO
    if (query?.minPrice !== undefined || query?.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined)
        (where.price as Prisma.DecimalFilter).gte = query.minPrice;
      if (query.maxPrice !== undefined)
        (where.price as Prisma.DecimalFilter).lte = query.maxPrice;
    }

    if (query?.tag) {
      where.tags = { has: query.tag };
    }

    if (query?.readyToShip) {
      where.stock = { gt: 0 };
    }

    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          images: { where: { isMain: true }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, name: true, shopName: true } },
        },
        orderBy: {
          [query?.sortBy === 'soldQuantity'
            ? 'createdAt'
            : query?.sortBy || 'createdAt']: query?.order || 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const enrichedData = await Promise.all(
      data.map(async (product) => {
        const pricing = await this.flashSalesService.calculateEffectivePrice(
          Number(product.price),
          product.categoryId,
        );
        return { ...product, pricing };
      }),
    );

    return {
      data: enrichedData,
      meta: {
        total,
        page,
        limit,
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

    const pricing = await this.flashSalesService.calculateEffectivePrice(
      Number(product.price),
      product.categoryId,
    );

    return { ...product, pricing };
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
    userRoles: string[],
  ) {
    const { images, ...productData } = updateProductDto;

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (!userRoles.includes('ROLE_ADMIN') && product.sellerId !== userId) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền chỉnh sửa sản phẩm của chính mình',
      );
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

  async remove(id: string, userId: string, userRoles: string[]) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (!userRoles.includes('ROLE_ADMIN') && product.sellerId !== userId) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền xóa sản phẩm của chính mình',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id: product.categoryId },
        data: { productsCount: { decrement: 1 } },
      });
      return tx.product.delete({ where: { id } });
    });
  }

  async getStats(userId: string, userRoles: string[]) {
    const stats = await this.prisma.product.groupBy({
      by: ['status'],
      _count: true,
      where: {
        deletedAt: null,
        ...(this.isAdmin(userRoles) ? {} : { sellerId: userId }),
      },
    });

    const result: Record<string, number> = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const s of stats) {
      const status = s.status.toLowerCase();
      result[status] = s._count;
      result.total += s._count;
    }
    return result;
  }

  async getBySeller(userId: string, userRoles: string[], sellerId: string) {
    if (!this.isAdmin(userRoles) && sellerId !== userId) {
      throw new ForbiddenException(
        'You can only view products from your own shop',
      );
    }

    return this.prisma.product.findMany({
      where: { sellerId },
      include: {
        category: true,
        images: true,
      },
    });
  }

  async getInventory(productId: string, userId: string, userRoles: string[]) {
    await this.assertProductOwnership(productId, userId, userRoles);

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

  async updateStock(
    productId: string,
    updateStockDto: UpdateStockDto,
    userId?: string,
    userRoles: string[] = [],
  ) {
    if (userId) {
      await this.assertProductOwnership(productId, userId, userRoles);
    }

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

  async getInventoryLog(
    productId: string,
    userId: string,
    userRoles: string[],
  ) {
    await this.assertProductOwnership(productId, userId, userRoles);

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

  async getLowStockProducts(
    userId: string,
    userRoles: string[],
    sellerId?: string,
  ) {
    if (!this.isAdmin(userRoles) && sellerId && sellerId !== userId) {
      throw new ForbiddenException(
        'You can only view low stock products from your own shop',
      );
    }

    const effectiveSellerId = this.isAdmin(userRoles) ? sellerId : userId;

    // Note: Prisma doesn't easily support field-to-field comparison in where clause (stock <= lowStockThreshold)
    // We use queryRaw for efficiency to avoid fetching all products
    const sellerFilter = effectiveSellerId
      ? Prisma.sql`AND p."sellerId" = ${effectiveSellerId}`
      : Prisma.empty;

    return this.prisma.$queryRaw`
      SELECT p.*, c.name as "categoryName"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p.stock <= p."lowStockThreshold"
      AND p."deletedAt" IS NULL
      ${sellerFilter}
      ORDER BY p.stock ASC
    `;
  }

  async getBestSellingProducts(limit?: number) {
    const take = this.normalizeFeaturedLimit(limit);

    const sales = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        product: {
          deletedAt: null,
          status: ProductStatus.APPROVED,
        },
        subOrder: {
          status: { not: OrderStatus.CANCELLED },
          order: {
            OR: [
              {
                paymentMethod: PaymentMethod.COD,
                status: {
                  in: [
                    OrderStatus.PENDING,
                    OrderStatus.PROCESSING,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                  ],
                },
              },
              {
                paymentMethod: PaymentMethod.STRIPE,
                paymentStatus: PaymentStatus.PAID,
                status: {
                  in: [
                    OrderStatus.PAID,
                    OrderStatus.PROCESSING,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                  ],
                },
              },
            ],
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take,
    });

    if (sales.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: sales.map((item) => item.productId) },
        deletedAt: null,
        status: ProductStatus.APPROVED,
      },
      include: {
        images: true,
        category: true,
        seller: { select: { id: true, name: true, shopName: true, avatar: true } },
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    return Promise.all(
      sales
        .map((item) => {
          const product = productMap.get(item.productId);
          if (!product) {
            return null;
          }

          return {
            ...product,
            soldQuantity: item._sum.quantity ?? 0,
          };
        })
        .filter((product): product is NonNullable<typeof product> => Boolean(product))
        .map(async (product) => ({
          ...product,
          pricing: await this.flashSalesService.calculateEffectivePrice(
            Number(product.price),
            product.categoryId,
          ),
        })),
    );
  }

  async getMostViewedProducts(limit?: number) {
    const take = this.normalizeFeaturedLimit(limit);

    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        status: ProductStatus.APPROVED,
      },
      include: {
        images: true,
        category: true,
        seller: { select: { id: true, name: true, shopName: true, avatar: true } },
      },
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
      take,
    });

    return Promise.all(
      products.map(async (product) => ({
        ...product,
        pricing: await this.flashSalesService.calculateEffectivePrice(
          Number(product.price),
          product.categoryId,
        ),
      })),
    );
  }

  async incrementViewCount(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }
}
