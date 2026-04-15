import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Prisma } from '@prisma/client';
import { VouchersService } from '../vouchers/vouchers.service';

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { images: true; category: true };
}>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
  ) {}

  private readonly cartInclude = {
    items: {
      include: {
        product: {
          include: {
            images: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' as const },
    },
  };

  async getCart(userId: string) {
    return this.getCartTransactional(userId, this.prisma);
  }

  private async getCartTransactional(
    userId: string,
    tx: Prisma.TransactionClient | PrismaService,
  ) {
    let cart = await tx.cart.findUnique({
      where: { userId },
      include: this.cartInclude,
    });

    if (!cart) {
      cart = await tx.cart.create({
        data: { userId },
        include: this.cartInclude,
      });
    }

    return cart;
  }

  async addItem(userId: string, dto: AddToCartDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId, deletedAt: null },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.stock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}`,
        );
      }

      const cart = await this.getOrCreateCartTransactional(userId, tx);

      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: dto.productId,
          },
        },
      });

      const newQuantity = existingItem
        ? existingItem.quantity + dto.quantity
        : dto.quantity;

      if (newQuantity > product.stock) {
        throw new BadRequestException(
          `Cannot add ${dto.quantity} more. You already have ${existingItem?.quantity || 0} in cart. Available stock: ${product.stock}`,
        );
      }

      await tx.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: dto.productId,
          },
        },
        update: { quantity: newQuantity },
        create: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
        },
      });

      return this.getCartTransactional(userId, tx);
    });
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await this.getOrCreateCartTransactional(userId, tx);

      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      if (!existingItem) {
        throw new NotFoundException('Item not found in cart');
      }

      if (dto.quantity === 0) {
        await tx.cartItem.delete({
          where: { id: existingItem.id },
        });
        return this.getCartTransactional(userId, tx);
      }

      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (product && dto.quantity > product.stock) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}`,
        );
      }

      await tx.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: dto.quantity },
      });

      return this.getCartTransactional(userId, tx);
    });
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.prisma.cartItem.delete({
      where: { id: existingItem.id },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }
  }
  async getSuggestions(
    userId: string,
    limit = 6,
  ): Promise<ProductWithRelations[]> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, categoryId: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return this.prisma.product.findMany({
        where: { status: 'APPROVED', deletedAt: null },
        include: { images: true, category: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    }

    const cartProductIds = cart.items.map((item) => item.productId);
    const categoryIds = [
      ...new Set(cart.items.map((item) => item.product.categoryId)),
    ];

    const suggestions = await this.prisma.$transaction(async (tx) => {
      // Fetch buffer from all relevant categories sorted by newest
      const pool = await tx.product.findMany({
        where: {
          categoryId: { in: categoryIds },
          status: 'APPROVED',
          deletedAt: null,
          id: { notIn: cartProductIds },
        },
        include: { images: true, category: true },
        take: Math.max(100, categoryIds.length * 10),
        orderBy: { createdAt: 'desc' },
      });

      // Group by categoryId
      const grouped = new Map<string, ProductWithRelations[]>();
      for (const p of pool) {
        if (!grouped.has(p.categoryId)) grouped.set(p.categoryId, []);
        grouped.get(p.categoryId)!.push(p as ProductWithRelations);
      }

      const picks: ProductWithRelations[] = [];
      const addedIds = new Set<string>();

      // Round-robin distribution
      let addedInRound = true;
      while (picks.length < limit && addedInRound) {
        addedInRound = false;
        for (const catId of categoryIds) {
          const group = grouped.get(catId);
          if (group && group.length > 0) {
            const product = group.shift();
            if (product) {
              picks.push(product);
              addedIds.add(product.id);
              addedInRound = true;
            }
          }
          if (picks.length >= limit) break;
        }
      }

      // If still space, fill from remaining results or generic
      if (picks.length < limit) {
        const remainingInPool = pool.filter((p) => !addedIds.has(p.id));
        for (const p of remainingInPool) {
          picks.push(p);
          addedIds.add(p.id);
          if (picks.length >= limit) break;
        }
      }

      if (picks.length < limit) {
        const more = await tx.product.findMany({
          where: {
            status: 'APPROVED',
            deletedAt: null,
            id: { notIn: [...cartProductIds, ...Array.from(addedIds)] },
          },
          include: { images: true, category: true },
          take: limit - picks.length,
          orderBy: { createdAt: 'desc' },
        });
        picks.push(...more);
      }

      return picks;
    });

    return suggestions.slice(0, limit);
  }

  async applyVoucher(userId: string, code: string) {
    const cart = await this.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const voucher = await this.vouchersService.findByCode(code);

    if (!voucher.isActive) {
      throw new BadRequestException('Voucher is inactive');
    }

    if (new Date(voucher.endDate) <= new Date()) {
      throw new BadRequestException('Voucher has expired');
    }

    // Filter items matching the category
    const eligibleItems = cart.items.filter(
      (item) => item.product.categoryId === voucher.categoryId,
    );

    if (eligibleItems.length === 0) {
      throw new BadRequestException(
        `Voucher này chỉ áp dụng cho các sản phẩm thuộc danh mục: ${voucher.category?.name || 'Không xác định'}`,
      );
    }

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    // Find matching range
    const matchedRange = voucher.ranges.find(
      (range) =>
        eligibleSubtotal >= Number(range.minPrice) &&
        eligibleSubtotal < Number(range.maxPrice),
    );

    if (!matchedRange) {
      const minRequired = Math.min(
        ...voucher.ranges.map((r) => Number(r.minPrice)),
      );
      if (eligibleSubtotal < minRequired) {
        throw new BadRequestException(
          `Giá trị đơn hàng tối thiểu cho các sản phẩm hợp lệ là: ${minRequired.toLocaleString('vi-VN')} vnđ. Hiện tại: ${eligibleSubtotal.toLocaleString('vi-VN')} vnđ`,
        );
      }
      throw new BadRequestException('Voucher không áp dụng cho mức giá này');
    }

    const discountAmount = Math.round(
      (eligibleSubtotal * Number(matchedRange.discountPercent)) / 100,
    );

    return {
      code: voucher.code,
      discountAmount,
      eligibleSubtotal,
      discountPercent: Number(matchedRange.discountPercent),
      message: 'Áp dụng voucher thành công',
    };
  }

  private async getOrCreateCart(userId: string) {
    return this.getOrCreateCartTransactional(userId, this.prisma);
  }

  private async getOrCreateCartTransactional(
    userId: string,
    tx: Prisma.TransactionClient | PrismaService,
  ) {
    let cart = await tx.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await tx.cart.create({
        data: { userId },
      });
    }

    return cart;
  }
}
