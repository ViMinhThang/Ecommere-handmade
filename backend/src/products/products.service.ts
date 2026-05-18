import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import {
  CategoryStatus,
  NotificationType,
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
import {
  createImageFileName,
  validateImageFile,
} from '../common/utils/image-upload';
import { sanitizeRichTextHtml } from '../common/utils/html-sanitizer';
import { NotificationsService } from '../notifications/notifications.service';

const FEATURED_PRODUCT_INCLUDE = {
  images: true,
  category: true,
  seller: { select: { id: true, name: true, shopName: true, avatar: true } },
} satisfies Prisma.ProductInclude;

type FeaturedProduct = Prisma.ProductGetPayload<{
  include: typeof FEATURED_PRODUCT_INCLUDE;
}>;

const PRODUCT_SELLER_SELECT = {
  id: true,
  name: true,
  shopName: true,
  avatar: true,
  sellerTitle: true,
  sellerBio: true,
} satisfies Prisma.UserSelect;

const LOW_STOCK_DEFAULT_PAGE = 1;
const LOW_STOCK_DEFAULT_LIMIT = 20;
const LOW_STOCK_MAX_LIMIT = 100;

export interface LowStockResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LowStockProductRow extends Record<string, unknown> {
  categoryName: string | null;
}

export interface LowStockResponse {
  data: LowStockProductRow[];
  meta: LowStockResponseMeta;
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private flashSalesService: FlashSalesService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  private normalizeFeaturedLimit(limit?: number) {
    if (!limit || !Number.isFinite(limit)) {
      return 10;
    }

    return Math.min(Math.max(Math.floor(limit), 1), 50);
  }

  private normalizeLowStockPage(page?: number) {
    if (!page || !Number.isFinite(page)) {
      return LOW_STOCK_DEFAULT_PAGE;
    }

    return Math.max(Math.floor(page), 1);
  }

  private normalizeLowStockLimit(limit?: number) {
    if (!limit || !Number.isFinite(limit)) {
      return LOW_STOCK_DEFAULT_LIMIT;
    }

    return Math.min(Math.max(Math.floor(limit), 1), LOW_STOCK_MAX_LIMIT);
  }

  private isAdmin(userRoles: string[]) {
    return userRoles.includes('ROLE_ADMIN');
  }

  private isSeller(userRoles: string[]) {
    return userRoles.includes('ROLE_SELLER');
  }

  private parseProductStatus(status: string) {
    const normalizedStatus = status.toUpperCase();
    if (
      !Object.values(ProductStatus).includes(normalizedStatus as ProductStatus)
    ) {
      throw new BadRequestException('Invalid product status');
    }

    return normalizedStatus as ProductStatus;
  }

  private normalizePagination(query?: ListProductsQueryDto) {
    const page = Math.max(Number(query?.page) || 1, 1);
    const rawLimit = Number(query?.limit) || 20;
    const limit = Math.min(Math.max(Math.floor(rawLimit), 1), 50);

    return { page, limit, skip: (page - 1) * limit };
  }

  private normalizeSort(query?: ListProductsQueryDto) {
    const allowedSortFields = new Set([
      'createdAt',
      'price',
      'name',
      'viewCount',
      'stock',
    ]);
    const sortBy =
      query?.sortBy && allowedSortFields.has(query.sortBy)
        ? query.sortBy
        : 'createdAt';
    const order = query?.order === 'asc' ? 'asc' : 'desc';

    return { [sortBy]: order } as Prisma.ProductOrderByWithRelationInput;
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
    validateImageFile(file);

    if (!file) {
      throw new BadRequestException('Vui lòng cung cấp file ảnh');
    }

    const aloudMimeTypes = [
      'image/jpeg',
      'image/jpg',
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

    const fileName = createImageFileName(file);
    const filePath = path.join(uploadPath, fileName);
    await fs.writeFile(filePath, file.buffer);

    return {
      url: `products/${fileName}`,
      fileName: fileName,
    };
  }

  async create(
    sellerId: string,
    userRoles: string[],
    createProductDto: CreateProductDto,
  ) {
    const { images, ...productData } = createProductDto;
    const status = this.isAdmin(userRoles)
      ? (productData.status ?? ProductStatus.PENDING)
      : ProductStatus.PENDING;
    const sanitizedDescription = sanitizeRichTextHtml(productData.description);

    const product = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          description: sanitizedDescription,
          status,
          sellerId,
          images: images?.length ? { create: images } : undefined,
        },
        include: {
          category: true,
          seller: { select: PRODUCT_SELLER_SELECT },
          images: true,
        },
      });

      await tx.category.update({
        where: { id: product.categoryId },
        data: { productsCount: { increment: 1 } },
      });

      return product;
    });

    if (product.status === ProductStatus.PENDING) {
      await this.notifyProductSubmitted(product);
    }

    return product;
  }

  async findAll(
    status?: string,
    categoryId?: string,
    sellerId?: string,
    query?: ListProductsQueryDto,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const where: Prisma.ProductWhereInput = { deletedAt: null };
    const isAdmin = this.isAdmin(actorRoles);
    const isOwnSellerQuery =
      this.isSeller(actorRoles) &&
      sellerId !== undefined &&
      sellerId === actorId;

    if (isAdmin) {
      if (status) where.status = this.parseProductStatus(status);
    } else if (isOwnSellerQuery) {
      if (status) where.status = this.parseProductStatus(status);
    } else {
      where.status = ProductStatus.APPROVED;
      where.category = { status: CategoryStatus.ACTIVE, deletedAt: null };
    }

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

    const { page, limit, skip } = this.normalizePagination(query);

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          images: { where: { isMain: true }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, name: true, shopName: true } },
        },
        orderBy: this.normalizeSort(query),
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

  async findOne(id: string, actorId?: string, actorRoles: string[] = []) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        seller: { select: PRODUCT_SELLER_SELECT },
        images: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const canManage =
      this.isAdmin(actorRoles) ||
      (this.isSeller(actorRoles) && product.sellerId === actorId);
    const isPublic =
      product.status === ProductStatus.APPROVED &&
      product.category.status === CategoryStatus.ACTIVE;

    if (!canManage && !isPublic) {
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

    const nextProductData = {
      ...productData,
      ...(productData.description !== undefined
        ? { description: sanitizeRichTextHtml(productData.description) }
        : {}),
      status: userRoles.includes('ROLE_ADMIN')
        ? productData.status
        : ProductStatus.PENDING,
    };

    const updatedProduct = await this.prisma.$transaction(async (tx) => {
      // If images are provided, replace them
      if (images) {
        await tx.productImage.deleteMany({
          where: { productId: id },
        });

        await tx.product.update({
          where: { id },
          data: {
            ...nextProductData,
            images: {
              create: images,
            },
          },
        });
      } else {
        await tx.product.update({
          where: { id },
          data: nextProductData,
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          seller: { select: PRODUCT_SELLER_SELECT },
          images: true,
        },
      });
    });

    if (updatedProduct) {
      if (
        userRoles.includes('ROLE_ADMIN') &&
        product.status !== updatedProduct.status &&
        (updatedProduct.status === ProductStatus.APPROVED ||
          updatedProduct.status === ProductStatus.REJECTED)
      ) {
        await this.notifyProductModerated(updatedProduct);
      } else if (
        !userRoles.includes('ROLE_ADMIN') &&
        updatedProduct.status === ProductStatus.PENDING
      ) {
        await this.notifyProductSubmitted(updatedProduct);
      }
    }

    return updatedProduct;
  }

  private async notifyProductSubmitted(product: {
    id: string;
    name: string;
    sellerId: string;
  }) {
    await this.notificationsService?.safeCreateForAdmins({
      type: NotificationType.PRODUCT_SUBMITTED,
      title: 'Sản phẩm chờ duyệt',
      message: `Sản phẩm "${product.name}" vừa được gửi lên và đang chờ duyệt.`,
      link: '/dashboard/products?status=PENDING',
      metadata: {
        productId: product.id,
        sellerId: product.sellerId,
      },
      dedupeKey: (adminId) =>
        `product:${product.id}:submitted:admin:${adminId}`,
    });
  }

  private async notifyProductModerated(product: {
    id: string;
    name: string;
    sellerId: string;
    status: ProductStatus;
  }) {
    const approved = product.status === ProductStatus.APPROVED;
    await this.notificationsService?.safeCreateForUser({
      userId: product.sellerId,
      type: approved
        ? NotificationType.PRODUCT_APPROVED
        : NotificationType.PRODUCT_REJECTED,
      title: approved ? 'Sản phẩm đã được duyệt' : 'Sản phẩm bị từ chối',
      message: approved
        ? `Sản phẩm "${product.name}" đã được duyệt và có thể hiển thị cho khách hàng.`
        : `Sản phẩm "${product.name}" đã bị từ chối. Vui lòng kiểm tra lại nội dung trước khi gửi duyệt lại.`,
      link: '/dashboard/products',
      metadata: {
        productId: product.id,
        status: product.status,
      },
      dedupeKey: `product:${product.id}:status:${product.status}:seller:${product.sellerId}`,
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
      if (updateStockDto.quantity < 0) {
        const result = await tx.product.updateMany({
          where: {
            id: productId,
            stock: { gte: Math.abs(updateStockDto.quantity) },
          },
          data: { stock: { decrement: Math.abs(updateStockDto.quantity) } },
        });

        if (result.count !== 1) {
          throw new BadRequestException('Insufficient stock');
        }
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: updateStockDto.quantity } },
        });
      }

      await tx.inventoryLog.create({
        data: {
          productId,
          change: updateStockDto.quantity,
          reason: updateStockDto.reason,
        },
      });

      return tx.product.findUnique({ where: { id: productId } });
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
    page?: number,
    limit?: number,
  ): Promise<LowStockResponse> {
    if (!this.isAdmin(userRoles) && sellerId && sellerId !== userId) {
      throw new ForbiddenException(
        'You can only view low stock products from your own shop',
      );
    }

    const effectiveSellerId = this.isAdmin(userRoles) ? sellerId : userId;
    const normalizedPage = this.normalizeLowStockPage(page);
    const normalizedLimit = this.normalizeLowStockLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    // Note: Prisma doesn't easily support field-to-field comparison in where clause (stock <= lowStockThreshold)
    // We use queryRaw for efficiency to avoid fetching all products
    const sellerFilter = effectiveSellerId
      ? Prisma.sql`AND p."sellerId" = ${effectiveSellerId}`
      : Prisma.empty;

    const [countRows, data] = await Promise.all([
      this.prisma.$queryRaw<Array<{ total: number | bigint }>>`
        SELECT COUNT(*)::int AS total
        FROM "Product" p
        WHERE p.stock <= p."lowStockThreshold"
          AND p."deletedAt" IS NULL
          ${sellerFilter}
      `,
      this.prisma.$queryRaw<LowStockProductRow[]>`
      SELECT p.*, c.name as "categoryName"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p.stock <= p."lowStockThreshold"
      AND p."deletedAt" IS NULL
      ${sellerFilter}
      ORDER BY p.stock ASC
      LIMIT ${normalizedLimit}
      OFFSET ${offset}
    `,
    ]);

    const total = Number(countRows[0]?.total ?? 0);

    return {
      data,
      meta: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / normalizedLimit),
      },
    };
  }

  async getBestSellingProducts(limit?: number) {
    const take = this.normalizeFeaturedLimit(limit);

    const sales = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        product: {
          deletedAt: null,
          status: ProductStatus.APPROVED,
          category: { status: CategoryStatus.ACTIVE, deletedAt: null },
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

    const soldProductIds = sales.map((item) => item.productId);
    const soldProducts = soldProductIds.length
      ? await this.prisma.product.findMany({
          where: {
            id: { in: soldProductIds },
            deletedAt: null,
            status: ProductStatus.APPROVED,
            category: { status: CategoryStatus.ACTIVE, deletedAt: null },
          },
          include: FEATURED_PRODUCT_INCLUDE,
        })
      : [];

    const productMap = new Map(
      soldProducts.map((product) => [product.id, product]),
    );

    const rankedProducts = sales
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
      .filter((product): product is NonNullable<typeof product> =>
        Boolean(product),
      );

    const fallbackCount = take - rankedProducts.length;

    if (fallbackCount > 0) {
      const excludedProductIds = rankedProducts.map((product) => product.id);
      const fallbackProducts = await this.prisma.product.findMany({
        where: {
          deletedAt: null,
          status: ProductStatus.APPROVED,
          category: { status: CategoryStatus.ACTIVE, deletedAt: null },
          ...(excludedProductIds.length > 0
            ? { id: { notIn: excludedProductIds } }
            : {}),
        },
        include: FEATURED_PRODUCT_INCLUDE,
        orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
        take: fallbackCount,
      });

      rankedProducts.push(
        ...fallbackProducts.map((product) => ({
          ...product,
          soldQuantity: 0,
        })),
      );
    }

    return Promise.all(
      rankedProducts.map(async (product) => ({
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
        category: { status: CategoryStatus.ACTIVE, deletedAt: null },
      },
      include: FEATURED_PRODUCT_INCLUDE,
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

  async getRecommendations(userId?: string, limit?: number) {
    const take = this.normalizeFeaturedLimit(limit);
    const selectedProductIds = new Set<string>();
    const products: FeaturedProduct[] = [];

    if (userId) {
      const categoryIds = await this.findUserRecommendationCategoryIds(userId);
      if (categoryIds.length > 0) {
        const personalizedProducts = await this.prisma.product.findMany({
          where: {
            ...this.getPublicRecommendationProductWhere(),
            categoryId: { in: categoryIds },
          },
          include: FEATURED_PRODUCT_INCLUDE,
          orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
          take,
        });

        for (const product of personalizedProducts) {
          selectedProductIds.add(product.id);
          products.push(product);
        }
      }
    }

    if (products.length < take) {
      const fallbackProducts = await this.getRecommendationFallbackProducts(
        take - products.length,
        Array.from(selectedProductIds),
      );

      products.push(...fallbackProducts);
    }

    return this.enrichFeaturedProducts(products.slice(0, take));
  }

  private async findUserRecommendationCategoryIds(userId: string) {
    const [orderItems, wishlistItems, cartItems] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: {
          product: this.getPublicRecommendationProductWhere(),
          subOrder: {
            status: { not: OrderStatus.CANCELLED },
            order: {
              customerId: userId,
              OR: [
                {
                  paymentMethod: PaymentMethod.COD,
                  status: {
                    in: [
                      OrderStatus.PROCESSING,
                      OrderStatus.SHIPPED,
                      OrderStatus.DELIVERED,
                    ],
                  },
                },
                {
                  paymentMethod: PaymentMethod.STRIPE,
                  paymentStatus: PaymentStatus.PAID,
                },
              ],
            },
          },
        },
        select: { product: { select: { categoryId: true } } },
        take: 50,
      }),
      this.prisma.wishlistItem.findMany({
        where: {
          userId,
          product: this.getPublicRecommendationProductWhere(),
        },
        select: { product: { select: { categoryId: true } } },
        take: 50,
      }),
      this.prisma.cartItem.findMany({
        where: {
          cart: { userId },
          product: this.getPublicRecommendationProductWhere(),
        },
        select: { product: { select: { categoryId: true } } },
        take: 50,
      }),
    ]);

    return Array.from(
      new Set(
        [...orderItems, ...wishlistItems, ...cartItems]
          .map((item) => item.product.categoryId)
          .filter(Boolean),
      ),
    );
  }

  private async getRecommendationFallbackProducts(
    take: number,
    excludedProductIds: string[],
  ) {
    if (take <= 0) {
      return [];
    }

    const productIdFilter =
      excludedProductIds.length > 0
        ? { id: { notIn: excludedProductIds } }
        : {};
    const sales = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        product: {
          ...this.getPublicRecommendationProductWhere(),
          ...productIdFilter,
        },
        subOrder: {
          status: { not: OrderStatus.CANCELLED },
          order: {
            OR: [
              {
                paymentMethod: PaymentMethod.COD,
                status: {
                  in: [
                    OrderStatus.PROCESSING,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                  ],
                },
              },
              {
                paymentMethod: PaymentMethod.STRIPE,
                paymentStatus: PaymentStatus.PAID,
              },
            ],
          },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take,
    });

    const rankedProductIds = sales.map((item) => item.productId);
    const rankedProducts = rankedProductIds.length
      ? await this.prisma.product.findMany({
          where: {
            ...this.getPublicRecommendationProductWhere(),
            id: { in: rankedProductIds },
          },
          include: FEATURED_PRODUCT_INCLUDE,
        })
      : [];

    const productMap = new Map(
      rankedProducts.map((product) => [product.id, product]),
    );
    const products = rankedProductIds
      .map((productId) => productMap.get(productId))
      .filter((product): product is FeaturedProduct => Boolean(product));

    if (products.length < take) {
      const excludeIds = [
        ...excludedProductIds,
        ...products.map((product) => product.id),
      ];
      const latestProducts = await this.prisma.product.findMany({
        where: {
          ...this.getPublicRecommendationProductWhere(),
          ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        },
        include: FEATURED_PRODUCT_INCLUDE,
        orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
        take: take - products.length,
      });

      products.push(...latestProducts);
    }

    return products;
  }

  private getPublicRecommendationProductWhere(): Prisma.ProductWhereInput {
    return {
      deletedAt: null,
      status: ProductStatus.APPROVED,
      stock: { gt: 0 },
      category: { status: CategoryStatus.ACTIVE, deletedAt: null },
    };
  }

  private enrichFeaturedProducts(products: FeaturedProduct[]) {
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
    const result = await this.prisma.product.updateMany({
      where: {
        id,
        deletedAt: null,
        status: ProductStatus.APPROVED,
        category: { status: CategoryStatus.ACTIVE, deletedAt: null },
      },
      data: { viewCount: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return { success: true };
  }
}
