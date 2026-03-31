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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const update_stock_dto_1 = require("./dto/update-stock.dto");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createProductDto) {
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
    async findAll(status, categoryId, sellerId) {
        const where = {};
        if (status)
            where.status = status.toUpperCase();
        if (categoryId)
            where.categoryId = categoryId;
        if (sellerId)
            where.sellerId = sellerId;
        return this.prisma.product.findMany({
            where,
            include: {
                category: true,
                seller: true,
                images: true,
            },
        });
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
        return product;
    }
    async update(id, updateProductDto) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
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
    async remove(id) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
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
    async getBySeller(sellerId) {
        return this.prisma.product.findMany({
            where: { sellerId },
            include: {
                category: true,
                images: true,
            },
        });
    }
    async getInventory(productId) {
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
    async updateStock(productId, updateStockDto) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        const newStock = product.stock + updateStockDto.quantity;
        if (newStock < 0) {
            throw new common_1.BadRequestException('Insufficient stock');
        }
        const [updatedProduct] = await this.prisma.$transaction([
            this.prisma.product.update({
                where: { id: productId },
                data: { stock: newStock },
            }),
            this.prisma.inventoryLog.create({
                data: {
                    productId,
                    change: updateStockDto.quantity,
                    reason: updateStockDto.reason,
                },
            }),
        ]);
        return updatedProduct;
    }
    async getInventoryLog(productId) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
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
    async getLowStockProducts(sellerId) {
        const products = await this.prisma.product.findMany({
            where: {
                stock: {
                    lte: 10,
                },
                ...(sellerId ? { sellerId } : {}),
            },
            include: {
                category: true,
                seller: true,
            },
            orderBy: {
                stock: 'asc',
            },
        });
        return products;
    }
    async updateStatus(id, status) {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        return this.prisma.product.update({
            where: { id },
            data: { status },
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map