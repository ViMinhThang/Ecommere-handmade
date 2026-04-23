import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Prisma, Voucher, VoucherRange } from '@prisma/client';
import { VouchersService } from '../vouchers/vouchers.service';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import {
  EnrichedCart,
  EnrichedCartItem,
} from '../common/interfaces/commerce.interface';

type CartWithItems = Prisma.CartGetPayload<{
  include: {
    appliedVoucher: {
      include: {
        ranges: true;
        category: true;
      };
    };
    items: {
      include: {
        product: {
          include: {
            images: true;
            category: true;
            seller: {
              select: {
                id: true;
                name: true;
                shopName: true;
                avatar: true;
              };
            };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
    private readonly flashSalesService: FlashSalesService,
  ) {}

  private readonly cartInclude = {
    appliedVoucher: {
      include: {
        ranges: true,
        category: true,
      },
    },
    items: {
      include: {
        product: {
          include: {
            images: true,
            category: true,
            seller: {
              select: {
                id: true,
                name: true,
                shopName: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' as const },
    },
  };

  async getCart(userId: string): Promise<EnrichedCart> {
    const cart = await this.getCartTransactional(userId, this.prisma);
    return this.enrichCart(cart);
  }

  private async enrichCart(cart: CartWithItems): Promise<EnrichedCart> {
    const enrichedItems = await this.enrichCartItems(cart.items);
    const subtotal = this.calculateSubtotal(enrichedItems);
    const voucherResult = await this.processAppliedVoucher(cart, enrichedItems);

    return {
      id: cart.id,
      userId: cart.userId,
      items: enrichedItems,
      subtotal,
      discountAmount: voucherResult.discountAmount,
      total: subtotal - voucherResult.discountAmount,
      appliedVoucher: voucherResult.appliedVoucher,
    };
  }

  private async enrichCartItems(items: any[]): Promise<EnrichedCartItem[]> {
    return Promise.all(
      items.map(async (item) => {
        const pricing = await this.flashSalesService.calculateEffectivePrice(
          Number(item.product.price),
          item.product.categoryId,
        );
        return {
          ...item,
          pricing,
        } as EnrichedCartItem;
      }),
    );
  }

  private calculateSubtotal(items: EnrichedCartItem[]): number {
    return items.reduce(
      (sum, item) => sum + item.pricing.discountedPrice * item.quantity,
      0,
    );
  }

  private async processAppliedVoucher(
    cart: CartWithItems,
    enrichedItems: EnrichedCartItem[],
  ) {
    if (!cart.appliedVoucher) {
      return { discountAmount: 0, appliedVoucher: null };
    }

    const voucher = cart.appliedVoucher;
    const eligibleItems = enrichedItems.filter(
      (item) => item.product.categoryId === voucher.categoryId,
    );

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, item) => sum + item.pricing.discountedPrice * item.quantity,
      0,
    );

    const matchedRange = this.findMatchingVoucherRange(
      voucher.ranges,
      eligibleSubtotal,
    );

    if (matchedRange && this.isVoucherValid(voucher, matchedRange)) {
      const discountAmount = Math.round(
        (eligibleSubtotal * Number(matchedRange.discountPercent)) / 100,
      );
      return {
        discountAmount,
        appliedVoucher: {
          code: voucher.code,
          discountAmount,
          discountPercent: Number(matchedRange.discountPercent),
        },
      };
    }

    // Voucher no longer valid or doesn't match, clear it
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedVoucherId: null },
    });
    return { discountAmount: 0, appliedVoucher: null };
  }

  private findMatchingVoucherRange(
    ranges: VoucherRange[],
    eligibleSubtotal: number,
  ) {
    return ranges.find(
      (range) =>
        eligibleSubtotal >= Number(range.minPrice) &&
        eligibleSubtotal < Number(range.maxPrice),
    );
  }

  private isVoucherValid(voucher: Voucher, matchedRange?: VoucherRange) {
    return (
      matchedRange && voucher.isActive && new Date(voucher.endDate) > new Date()
    );
  }

  private async getCartTransactional(
    userId: string,
    tx: Prisma.TransactionClient | PrismaService,
  ): Promise<CartWithItems> {
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

    return cart as CartWithItems;
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + (dto.quantity || 1) },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity || 1,
      },
    });
  }

  async updateItemQuantity(userId: string, productId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found in cart');
    }

    if (dto.quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
    });
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);

    return this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }

  async getSuggestions(userId: string, limit = 4) {
    const cart = await this.getCart(userId);
    const categoryIds = cart.items.map((item) => item.product.categoryId);

    if (categoryIds.length === 0) {
      return this.prisma.product.findMany({
        where: { status: 'APPROVED', deletedAt: null },
        take: limit,
        include: { images: { where: { isMain: true } } },
      });
    }

    return this.prisma.product.findMany({
      where: {
        status: 'APPROVED',
        deletedAt: null,
        categoryId: { in: categoryIds },
        id: { notIn: cart.items.map((i) => i.productId) },
      },
      take: limit,
      include: { images: { where: { isMain: true } } },
    });
  }

  async applyVoucher(userId: string, code: string) {
    const cart = await this.getOrCreateCart(userId);
    const voucher = await this.vouchersService.findByCode(code);

    if (!voucher.isActive) {
      throw new BadRequestException('Voucher is inactive');
    }

    if (new Date(voucher.endDate) <= new Date()) {
      throw new BadRequestException('Voucher has expired');
    }

    const cartWithItems = await this.getCart(userId);
    const hasEligibleItems = cartWithItems.items.some(
      (item) => item.product.categoryId === voucher.categoryId,
    );

    if (!hasEligibleItems) {
      throw new BadRequestException(
        `Voucher này chỉ áp dụng cho các sản phẩm thuộc danh mục: ${voucher.category?.name || 'Không xác định'}`,
      );
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedVoucherId: voucher.id },
    });

    return this.getCart(userId);
  }

  async removeVoucher(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedVoucherId: null },
    });
    return this.getCart(userId);
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
