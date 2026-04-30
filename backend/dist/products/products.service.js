"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const update_stock_dto_1 = require("./dto/update-stock.dto");
const flash_sales_service_1 = require("../flash-sales/flash-sales.service");
let ProductsService = class ProductsService {
    prisma;
    flashSalesService;
    constructor(prisma, flashSalesService) {
        this.prisma = prisma;
        this.flashSalesService = flashSalesService;
    }
    normalizeFeaturedLimit(limit) {
        if (!limit || !Number.isFinite(limit)) {
            return 10;
        }
        return Math.min(Math.max(Math.floor(limit), 1), 50);
    }
    isAdmin(userRoles) {
        return userRoles.includes('ROLE_ADMIN');
    }
    async assertProductOwnership(productId, userId, userRoles) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                sellerId: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        if (!this.isAdmin(userRoles) && product.sellerId !== userId) {
            throw new common_1.ForbiddenException('You can only access products that belong to your shop');
        }
        return product;
    }
    async uploadImage(file) {
        if (!file) {
            throw new common_1.BadRequestException('Vui lòng cung cấp file ảnh');
        }
        const aloudMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
        ];
        if (!aloudMimeTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Chỉ chấp nhận các loại file ảnh (jpeg, png, webp, gif)');
        }
        const uploadPath = path.join('uploads', 'products');
        await fs_1.promises.mkdir(uploadPath, { recursive: true });
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadPath, fileName);
        await fs_1.promises.writeFile(filePath, file.buffer);
        return {
            url: `products/${fileName}`,
            fileName: fileName,
        };
    }
    async create(sellerId, createProductDto) {
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
    async findAll(status, categoryId, sellerId, query) {
        const where = { deletedAt: null };
        if (status)
            where.status = status.toUpperCase();
        if (categoryId)
            where.categoryId = categoryId;
        if (sellerId)
            where.sellerId = sellerId;
        if (query?.minPrice !== undefined || query?.maxPrice !== undefined) {
            where.price = {};
            if (query.minPrice !== undefined)
                where.price.gte = query.minPrice;
            if (query.maxPrice !== undefined)
                where.price.lte = query.maxPrice;
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
        const enrichedData = await Promise.all(data.map(async (product) => {
            const pricing = await this.flashSalesService.calculateEffectivePrice(Number(product.price), product.categoryId);
            return { ...product, pricing };
        }));
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
    async findOne(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                seller: true,
                images: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        const pricing = await this.flashSalesService.calculateEffectivePrice(Number(product.price), product.categoryId);
        return { ...product, pricing };
    }
    async update(id, updateProductDto, userId, userRoles) {
        const { images, ...productData } = updateProductDto;
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        if (!userRoles.includes('ROLE_ADMIN') && product.sellerId !== userId) {
            throw new common_1.ForbiddenException('Bạn chỉ có quyền chỉnh sửa sản phẩm của chính mình');
        }
        return this.prisma.$transaction(async (tx) => {
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
            }
            else {
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
    async remove(id, userId, userRoles) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        if (!userRoles.includes('ROLE_ADMIN') && product.sellerId !== userId) {
            throw new common_1.ForbiddenException('Bạn chỉ có quyền xóa sản phẩm của chính mình');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.category.update({
                where: { id: product.categoryId },
                data: { productsCount: { decrement: 1 } },
            });
            return tx.product.delete({ where: { id } });
        });
    }
    async getStats(userId, userRoles) {
        const stats = await this.prisma.product.groupBy({
            by: ['status'],
            _count: true,
            where: {
                deletedAt: null,
                ...(this.isAdmin(userRoles) ? {} : { sellerId: userId }),
            },
        });
        const result = {
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
    async getBySeller(userId, userRoles, sellerId) {
        if (!this.isAdmin(userRoles) && sellerId !== userId) {
            throw new common_1.ForbiddenException('You can only view products from your own shop');
        }
        return this.prisma.product.findMany({
            where: { sellerId },
            include: {
                category: true,
                images: true,
            },
        });
    }
    async getInventory(productId, userId, userRoles) {
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
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        return product;
    }
    async updateStock(productId, updateStockDto, userId, userRoles = []) {
        if (userId) {
            await this.assertProductOwnership(productId, userId, userRoles);
        }
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        const updatedProduct = await this.prisma.$transaction(async (tx) => {
            const current = await tx.product.findUnique({ where: { id: productId } });
            if (!current) {
                throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
            }
            const newStock = current.stock + updateStockDto.quantity;
            if (newStock < 0) {
                throw new common_1.BadRequestException('Insufficient stock');
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
    async getInventoryLog(productId, userId, userRoles) {
        await this.assertProductOwnership(productId, userId, userRoles);
        return this.prisma.inventoryLog.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deductStock(productId, quantity) {
        return this.updateStock(productId, {
            quantity: -quantity,
            reason: update_stock_dto_1.InventoryChangeReason.ORDER,
        });
    }
    async getLowStockProducts(userId, userRoles, sellerId) {
        if (!this.isAdmin(userRoles) && sellerId && sellerId !== userId) {
            throw new common_1.ForbiddenException('You can only view low stock products from your own shop');
        }
        const effectiveSellerId = this.isAdmin(userRoles) ? sellerId : userId;
        const sellerFilter = effectiveSellerId
            ? client_1.Prisma.sql `AND p."sellerId" = ${effectiveSellerId}`
            : client_1.Prisma.empty;
        return this.prisma.$queryRaw `
      SELECT p.*, c.name as "categoryName"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p.stock <= p."lowStockThreshold"
      AND p."deletedAt" IS NULL
      ${sellerFilter}
      ORDER BY p.stock ASC
    `;
    }
    async getBestSellingProducts(limit) {
        const take = this.normalizeFeaturedLimit(limit);
        const sales = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                product: {
                    deletedAt: null,
                    status: client_1.ProductStatus.APPROVED,
                },
                subOrder: {
                    status: { not: client_1.OrderStatus.CANCELLED },
                    order: {
                        OR: [
                            {
                                paymentMethod: client_1.PaymentMethod.COD,
                                status: {
                                    in: [
                                        client_1.OrderStatus.PENDING,
                                        client_1.OrderStatus.PROCESSING,
                                        client_1.OrderStatus.SHIPPED,
                                        client_1.OrderStatus.DELIVERED,
                                    ],
                                },
                            },
                            {
                                paymentMethod: client_1.PaymentMethod.STRIPE,
                                paymentStatus: client_1.PaymentStatus.PAID,
                                status: {
                                    in: [
                                        client_1.OrderStatus.PAID,
                                        client_1.OrderStatus.PROCESSING,
                                        client_1.OrderStatus.SHIPPED,
                                        client_1.OrderStatus.DELIVERED,
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
                status: client_1.ProductStatus.APPROVED,
            },
            include: {
                images: true,
                category: true,
                seller: { select: { id: true, name: true, shopName: true, avatar: true } },
            },
        });
        const productMap = new Map(products.map((product) => [product.id, product]));
        return Promise.all(sales
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
            .filter((product) => Boolean(product))
            .map(async (product) => ({
            ...product,
            pricing: await this.flashSalesService.calculateEffectivePrice(Number(product.price), product.categoryId),
        })));
    }
    async getMostViewedProducts(limit) {
        const take = this.normalizeFeaturedLimit(limit);
        const products = await this.prisma.product.findMany({
            where: {
                deletedAt: null,
                status: client_1.ProductStatus.APPROVED,
            },
            include: {
                images: true,
                category: true,
                seller: { select: { id: true, name: true, shopName: true, avatar: true } },
            },
            orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
            take,
        });
        return Promise.all(products.map(async (product) => ({
            ...product,
            pricing: await this.flashSalesService.calculateEffectivePrice(Number(product.price), product.categoryId),
        })));
    }
    async incrementViewCount(id) {
        return this.prisma.product.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        flash_sales_service_1.FlashSalesService])
], ProductsService);
//# sourceMappingURL=products.service.js.map