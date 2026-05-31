import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  CategoryStatus,
  Prisma,
  ProductStatus,
  Voucher,
  VoucherRange,
} from '@prisma/client';
import { VouchersService } from '../vouchers/vouchers.service';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import {
  EnrichedCart,
  EnrichedCartItem,
} from '../common/interfaces/commerce.interface';

interface PersonalizationSnapshot {
  text: string;
}

type PurchasableProductForCart = Prisma.ProductGetPayload<{
  select: {
    id: true;
    personalizationEnabled: true;
    personalizationRequired: true;
    personalizationMaxLength: true;
  };
}>;

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
      where: {
        product: {
          deletedAt: null,
          status: ProductStatus.APPROVED,
          stock: { gt: 0 },
          category: { status: CategoryStatus.ACTIVE, deletedAt: null },
        },
      },
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

  private async enrichCartItems(
    items: CartWithItems['items'],
  ): Promise<EnrichedCartItem[]> {
    return Promise.all(
      items.map(async (item) => {
        const pricing = await this.flashSalesService.calculateEffectivePrice(
          Number(item.product.price),
          item.product.categoryId,
          item.product.id,
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
    const eligibleItems = enrichedItems.filter((item) =>
      this.isVoucherItemEligible(item, voucher),
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
      try {
        await this.vouchersService.assertVoucherUsageAvailable(
          voucher,
          cart.userId,
        );
      } catch (error) {
        if (!(error instanceof BadRequestException)) {
          throw error;
        }
        await this.clearAppliedVoucher(cart.id);
        return { discountAmount: 0, appliedVoucher: null };
      }

      const discountAmount = this.vouchersService.calculateDiscountAmount(
        voucher,
        matchedRange,
        eligibleSubtotal,
      );
      return {
        discountAmount,
        appliedVoucher: {
          code: voucher.code,
          discountAmount,
          discountPercent: Number(matchedRange.discountPercent),
          categoryId: voucher.categoryId,
          sellerId: voucher.sellerId,
        },
      };
    }

    // Voucher no longer valid or doesn't match, clear it
    await this.clearAppliedVoucher(cart.id);
    return { discountAmount: 0, appliedVoucher: null };
  }

  private findMatchingVoucherRange(
    ranges: VoucherRange[],
    eligibleSubtotal: number,
  ) {
    const now = new Date();
    return ranges.find(
      (range) =>
        !range.deletedAt &&
        new Date(range.endDate) > now &&
        eligibleSubtotal >= Number(range.minPrice) &&
        (range.maxPrice == null || eligibleSubtotal <= Number(range.maxPrice)),
    );
  }

  private isVoucherValid(voucher: Voucher, matchedRange?: VoucherRange) {
    const now = new Date();
    return (
      matchedRange &&
      !matchedRange.deletedAt &&
      voucher.isActive &&
      new Date(voucher.endDate) > now &&
      new Date(matchedRange.endDate) > now
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
    const requestedQuantity = dto.quantity || 1;
    const product = await this.getPurchasableProductForCart(
      dto.productId,
      requestedQuantity,
    );
    const personalization = this.normalizePersonalization(
      product,
      dto.personalization,
    );
    const shouldWritePersonalization =
      dto.personalization !== undefined || product.personalizationRequired;

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      const nextQuantity = existingItem.quantity + requestedQuantity;
      await this.getPurchasableProductForCart(dto.productId, nextQuantity);

      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: nextQuantity,
          ...(shouldWritePersonalization
            ? {
                personalization:
                  this.toPersonalizationJsonValue(personalization),
              }
            : {}),
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: requestedQuantity,
        ...(personalization
          ? {
              personalization:
                personalization as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ) {
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

    const product = await this.getPurchasableProductForCart(
      productId,
      dto.quantity,
    );
    const personalization =
      dto.personalization === undefined
        ? undefined
        : this.normalizePersonalization(product, dto.personalization);

    if (
      dto.personalization === undefined &&
      product.personalizationRequired &&
      !this.hasPersonalizationText(item.personalization)
    ) {
      throw new BadRequestException(
        'Personalization text is required for this product',
      );
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity: dto.quantity,
        ...(dto.personalization !== undefined
          ? {
              personalization: this.toPersonalizationJsonValue(
                personalization ?? null,
              ),
            }
          : {}),
      },
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
        where: {
          status: ProductStatus.APPROVED,
          deletedAt: null,
          category: { status: CategoryStatus.ACTIVE, deletedAt: null },
        },
        take: limit,
        include: { images: { where: { isMain: true } } },
      });
    }

    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        deletedAt: null,
        category: { status: CategoryStatus.ACTIVE, deletedAt: null },
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
    const hasEligibleItems = cartWithItems.items.some((item) =>
      this.isVoucherItemEligible(item, voucher),
    );

    if (!hasEligibleItems) {
      throw new BadRequestException(
        `Voucher này chỉ áp dụng cho các sản phẩm thuộc danh mục: ${voucher.category?.name || 'Không xác định'}`,
      );
    }

    const eligibleSubtotal = cartWithItems.items
      .filter((item) => this.isVoucherItemEligible(item, voucher))
      .reduce(
        (sum, item) => sum + item.pricing.discountedPrice * item.quantity,
        0,
      );
    const matchedRange = this.findMatchingVoucherRange(
      voucher.ranges,
      eligibleSubtotal,
    );

    if (!this.isVoucherValid(voucher, matchedRange)) {
      throw new BadRequestException('Voucher cannot be applied to this cart');
    }

    await this.vouchersService.assertVoucherUsageAvailable(voucher, userId);

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedVoucherId: voucher.id },
    });

    return this.getCart(userId);
  }

  private isVoucherItemEligible(
    item: EnrichedCartItem,
    voucher: { categoryId: string; sellerId?: string | null },
  ) {
    return (
      item.product.categoryId === voucher.categoryId &&
      (!voucher.sellerId || item.product.sellerId === voucher.sellerId)
    );
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

  private async clearAppliedVoucher(cartId: string) {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { appliedVoucherId: null },
    });
  }

  private async getPurchasableProductForCart(
    productId: string,
    quantity: number,
  ): Promise<PurchasableProductForCart> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        status: ProductStatus.APPROVED,
        stock: { gte: quantity },
        category: {
          deletedAt: null,
          status: CategoryStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        personalizationEnabled: true,
        personalizationRequired: true,
        personalizationMaxLength: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Product is not available for purchase');
    }

    return product;
  }

  private normalizePersonalization(
    product: PurchasableProductForCart,
    personalization?: AddToCartDto['personalization'],
  ): PersonalizationSnapshot | null {
    const rawText = personalization?.text;
    const sanitizedText =
      typeof rawText === 'string'
        ? rawText
            .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim()
        : '';

    if (!product.personalizationEnabled) {
      if (sanitizedText) {
        throw new BadRequestException(
          'Personalization is not enabled for this product',
        );
      }

      return null;
    }

    if (product.personalizationRequired && !sanitizedText) {
      throw new BadRequestException(
        'Personalization text is required for this product',
      );
    }

    if (!sanitizedText) {
      return null;
    }

    if (sanitizedText.length > product.personalizationMaxLength) {
      throw new BadRequestException(
        `Personalization text must be at most ${product.personalizationMaxLength} characters`,
      );
    }

    return { text: sanitizedText };
  }

  private toPersonalizationJsonValue(
    personalization: PersonalizationSnapshot | null,
  ) {
    return personalization
      ? (personalization as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull;
  }

  private hasPersonalizationText(value: Prisma.JsonValue | null) {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof value.text === 'string' &&
      value.text.trim().length > 0
    );
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
