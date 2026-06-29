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

interface SelectedOptionsSnapshot {
  color?: string;
  material?: string;
  size?: string;
  processingTime?: string;
}

type PurchasableProductForCart = Prisma.ProductGetPayload<{
  select: {
    id: true;
    personalizationEnabled: true;
    personalizationRequired: true;
    personalizationMaxLength: true;
    optionColors: true;
    optionMaterials: true;
    optionSizes: true;
    processingTime: true;
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
            shippingProfile: true;
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

type CartEligibleVoucherSource = Voucher & {
  category?: { id: string; name: string } | null;
  seller?: { id: string; name: string; shopName: string | null } | null;
  ranges: VoucherRange[];
};

type VoucherEligibilityResult =
  | {
      eligible: true;
      eligibleSubtotal: number;
      matchedRange: VoucherRange;
    }
  | {
      eligible: false;
      reason: string;
    };

export interface EligibleCartVoucherPayload {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: 'platform' | 'shop';
  sellerId: string | null;
  sellerName: string | null;
  categoryId: string;
  categoryName: string | null;
  endDate: Date;
  discountPercent: number;
  minPrice: number;
  maxPrice: number | null;
  maxDiscountAmount: number | null;
  eligibleSubtotal: number;
  estimatedDiscountAmount: number;
}

export interface IneligibleCartVoucherPayload {
  id: string;
  code: string;
  reason: string;
}

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
            shippingProfile: true,
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
    const selectedOptions = this.normalizeSelectedOptions(
      product,
      dto.selectedOptions,
    );
    const shouldWritePersonalization =
      dto.personalization !== undefined || product.personalizationRequired;
    const shouldWriteSelectedOptions =
      dto.selectedOptions !== undefined ||
      this.productHasOptionMetadata(product);

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
          ...(shouldWriteSelectedOptions
            ? {
                selectedOptions:
                  this.toSelectedOptionsJsonValue(selectedOptions),
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
        ...(selectedOptions
          ? {
              selectedOptions:
                selectedOptions as unknown as Prisma.InputJsonValue,
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
    const selectedOptions =
      dto.selectedOptions === undefined
        ? undefined
        : this.normalizeSelectedOptions(product, dto.selectedOptions);

    if (
      dto.personalization === undefined &&
      product.personalizationRequired &&
      !this.hasPersonalizationText(item.personalization)
    ) {
      throw new BadRequestException(
        'Personalization text is required for this product',
      );
    }

    if (
      dto.selectedOptions === undefined &&
      this.productHasSelectableOptions(product) &&
      !this.hasSelectedOptionsForProduct(item.selectedOptions, product)
    ) {
      throw new BadRequestException(
        'Selected product options are required for this product',
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
        ...(dto.selectedOptions !== undefined
          ? {
              selectedOptions: this.toSelectedOptionsJsonValue(
                selectedOptions ?? null,
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

  async getEligibleVouchers(userId: string) {
    const cart = await this.getCart(userId);
    const vouchersResult = await this.vouchersService.findAll({
      page: 1,
      limit: 50,
    });
    const vouchers = vouchersResult.data as CartEligibleVoucherSource[];
    const platformVouchers: EligibleCartVoucherPayload[] = [];
    const shopVouchers: EligibleCartVoucherPayload[] = [];
    const ineligibleVouchers: IneligibleCartVoucherPayload[] = [];

    for (const voucher of vouchers) {
      const eligibility = await this.getVoucherEligibility(
        cart.items,
        voucher,
        userId,
      );

      if (!eligibility.eligible) {
        ineligibleVouchers.push({
          id: voucher.id,
          code: voucher.code,
          reason: eligibility.reason,
        });
        continue;
      }

      const payload = this.toEligibleVoucherPayload(
        voucher,
        eligibility.matchedRange,
        eligibility.eligibleSubtotal,
      );

      if (voucher.sellerId) {
        shopVouchers.push(payload);
      } else {
        platformVouchers.push(payload);
      }
    }

    return {
      platformVouchers,
      shopVouchers,
      ineligibleVouchers,
    };
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
    const eligibility = await this.getVoucherEligibility(
      cartWithItems.items,
      voucher,
      userId,
    );

    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedVoucherId: voucher.id },
    });

    return this.getCart(userId);
  }

  private async getVoucherEligibility(
    items: EnrichedCartItem[],
    voucher: CartEligibleVoucherSource,
    userId: string,
  ): Promise<VoucherEligibilityResult> {
    if (items.length === 0) {
      return { eligible: false, reason: 'Giỏ hàng đang trống' };
    }

    const sellerMatchedItems = voucher.sellerId
      ? items.filter((item) => item.product.sellerId === voucher.sellerId)
      : items;

    if (sellerMatchedItems.length === 0) {
      return {
        eligible: false,
        reason: 'Không có sản phẩm thuộc shop áp dụng voucher',
      };
    }

    const eligibleItems = sellerMatchedItems.filter(
      (item) => item.product.categoryId === voucher.categoryId,
    );

    if (eligibleItems.length === 0) {
      return {
        eligible: false,
        reason: 'Không có sản phẩm thuộc danh mục áp dụng voucher',
      };
    }

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, item) => sum + item.pricing.discountedPrice * item.quantity,
      0,
    );
    const matchedRange = this.findMatchingVoucherRange(
      voucher.ranges,
      eligibleSubtotal,
    );

    if (!matchedRange) {
      return {
        eligible: false,
        reason: this.getVoucherRangeReason(voucher.ranges, eligibleSubtotal),
      };
    }

    if (!this.isVoucherValid(voucher, matchedRange)) {
      return {
        eligible: false,
        reason: 'Voucher không còn hiệu lực',
      };
    }

    try {
      await this.vouchersService.assertVoucherUsageAvailable(voucher, userId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        return {
          eligible: false,
          reason: 'Voucher đã hết lượt sử dụng',
        };
      }

      throw error;
    }

    return {
      eligible: true,
      eligibleSubtotal,
      matchedRange,
    };
  }

  private getVoucherRangeReason(
    ranges: VoucherRange[],
    eligibleSubtotal: number,
  ) {
    const activeRanges = ranges.filter(
      (range) =>
        !range.deletedAt &&
        new Date(range.endDate).getTime() > Date.now(),
    );

    if (activeRanges.length === 0) {
      return 'Voucher không còn khoảng giá hợp lệ';
    }

    const minPrice = Math.min(
      ...activeRanges.map((range) => Number(range.minPrice)),
    );
    const maxPrices = activeRanges
      .map((range) => range.maxPrice)
      .filter((value): value is NonNullable<typeof value> => value != null)
      .map((value) => Number(value));
    const hasUnlimitedMax = activeRanges.some(
      (range) => range.maxPrice == null,
    );
    const maxPrice =
      maxPrices.length > 0 ? Math.max(...maxPrices) : Number.POSITIVE_INFINITY;

    if (eligibleSubtotal < minPrice) {
      return 'Chưa đủ giá trị đơn để dùng voucher';
    }

    if (!hasUnlimitedMax && eligibleSubtotal > maxPrice) {
      return 'Giá trị đơn vượt giới hạn áp dụng voucher';
    }

    return 'Đơn hàng chưa đủ điều kiện áp dụng voucher';
  }

  private toEligibleVoucherPayload(
    voucher: CartEligibleVoucherSource,
    matchedRange: VoucherRange,
    eligibleSubtotal: number,
  ): EligibleCartVoucherPayload {
    const estimatedDiscountAmount =
      this.vouchersService.calculateDiscountAmount(
        voucher,
        matchedRange,
        eligibleSubtotal,
      );

    return {
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      description: voucher.description,
      scope: voucher.sellerId ? 'shop' : 'platform',
      sellerId: voucher.sellerId,
      sellerName: voucher.seller?.shopName || voucher.seller?.name || null,
      categoryId: voucher.categoryId,
      categoryName: voucher.category?.name || null,
      endDate: voucher.endDate,
      discountPercent: Number(matchedRange.discountPercent),
      minPrice: Number(matchedRange.minPrice),
      maxPrice:
        matchedRange.maxPrice == null ? null : Number(matchedRange.maxPrice),
      maxDiscountAmount:
        voucher.maxDiscountAmount == null
          ? null
          : Number(voucher.maxDiscountAmount),
      eligibleSubtotal,
      estimatedDiscountAmount,
    };
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
        optionColors: true,
        optionMaterials: true,
        optionSizes: true,
        processingTime: true,
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

  private normalizeSelectedOptions(
    product: PurchasableProductForCart,
    selectedOptions?: AddToCartDto['selectedOptions'],
  ): SelectedOptionsSnapshot | null {
    const color = this.sanitizeOptionText(selectedOptions?.color);
    const material = this.sanitizeOptionText(selectedOptions?.material);
    const size = this.sanitizeOptionText(selectedOptions?.size);
    const processingTime = this.sanitizeOptionText(product.processingTime);

    if (!this.productHasOptionMetadata(product)) {
      if (color || material || size) {
        throw new BadRequestException(
          'Product options are not enabled for this product',
        );
      }

      return null;
    }

    const snapshot: SelectedOptionsSnapshot = {};
    this.assignRequiredOption(snapshot, 'color', color, product.optionColors);
    this.assignRequiredOption(
      snapshot,
      'material',
      material,
      product.optionMaterials,
    );
    this.assignRequiredOption(snapshot, 'size', size, product.optionSizes);

    if (color && !product.optionColors.length) {
      throw new BadRequestException('Color option is not available');
    }

    if (material && !product.optionMaterials.length) {
      throw new BadRequestException('Material option is not available');
    }

    if (size && !product.optionSizes.length) {
      throw new BadRequestException('Size option is not available');
    }

    if (processingTime) {
      snapshot.processingTime = processingTime;
    }

    return Object.keys(snapshot).length ? snapshot : null;
  }

  private assignRequiredOption(
    snapshot: SelectedOptionsSnapshot,
    field: 'color' | 'material' | 'size',
    value: string,
    availableOptions: string[],
  ) {
    if (availableOptions.length === 0) {
      return;
    }

    if (!value) {
      throw new BadRequestException(`Product ${field} option is required`);
    }

    const normalizedValue = value.toLocaleLowerCase('vi-VN');
    const matchedOption = availableOptions.find(
      (option) =>
        this.sanitizeOptionText(option).toLocaleLowerCase('vi-VN') ===
        normalizedValue,
    );

    if (!matchedOption) {
      throw new BadRequestException(`Invalid product ${field} option`);
    }

    snapshot[field] = this.sanitizeOptionText(matchedOption);
  }

  private sanitizeOptionText(value: unknown) {
    return typeof value === 'string'
      ? value
          .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim()
      : '';
  }

  private productHasSelectableOptions(product: PurchasableProductForCart) {
    return (
      product.optionColors.length > 0 ||
      product.optionMaterials.length > 0 ||
      product.optionSizes.length > 0
    );
  }

  private productHasOptionMetadata(product: PurchasableProductForCart) {
    return (
      this.productHasSelectableOptions(product) ||
      this.sanitizeOptionText(product.processingTime).length > 0
    );
  }

  private toSelectedOptionsJsonValue(
    selectedOptions: SelectedOptionsSnapshot | null,
  ) {
    return selectedOptions
      ? (selectedOptions as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull;
  }

  private hasSelectedOptionsForProduct(
    value: Prisma.JsonValue | null,
    product: PurchasableProductForCart,
  ) {
    if (!this.productHasSelectableOptions(product)) {
      return true;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const selected = value as SelectedOptionsSnapshot;

    return (
      (!product.optionColors.length ||
        this.sanitizeOptionText(selected.color).length > 0) &&
      (!product.optionMaterials.length ||
        this.sanitizeOptionText(selected.material).length > 0) &&
      (!product.optionSizes.length ||
        this.sanitizeOptionText(selected.size).length > 0)
    );
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
