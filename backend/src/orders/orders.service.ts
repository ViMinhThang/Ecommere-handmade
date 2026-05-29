import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { CartService } from '../cart/cart.service';
import {
  EnrichedCart,
  EnrichedCartItem,
  UnifiedOrder,
} from '../common/interfaces/commerce.interface';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SubOrder,
  ProductStatus,
  CategoryStatus,
  InventoryChangeReason,
  CustomOrderStatus,
  MarketplaceLedgerEntryStatus,
  MarketplaceLedgerEntryType,
  RefundStatus,
  FlashSaleState,
  NotificationType,
  Role,
  UserStatus,
} from '@prisma/client';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { SettingsService } from '../settings/settings.service';
import { RewardsService } from '../rewards/rewards.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VouchersService } from '../vouchers/vouchers.service';

const SHIPPING_FEE = 25000;
const CURRENCY = 'vnd';
const DEFAULT_PLATFORM_COMMISSION_BPS = 1000;
const STRIPE_PAYMENT_EXPIRY_MS = 30 * 60 * 1000;
const EXPIRED_ORDER_SWEEP_MS = 5 * 60 * 1000;
const CART_PRICING_CHANGED_MESSAGE =
  'Cart pricing changed. Please refresh your cart.';
const FLASH_SALE_SOLD_OUT_MESSAGE =
  'Flash sale is sold out. Please refresh your cart.';
const FLASH_SALE_INSUFFICIENT_STOCK_MESSAGE =
  'Insufficient stock for flash sale. Please refresh your cart.';
const FLASH_SALE_PURCHASE_LIMIT_EXCEEDED_MESSAGE =
  'Flash sale purchase limit exceeded. Please refresh your cart.';
const FLASH_SALE_COUNTER_STATE_INCONSISTENT_MESSAGE =
  'Flash sale reservation state is inconsistent';
const VOUCHER_INVALID_MESSAGE =
  'Voucher is no longer valid. Please refresh your cart.';
const VOUCHER_PRICING_CHANGED_MESSAGE =
  'Voucher discount changed. Please refresh your cart.';
const VOUCHER_USAGE_LIMIT_EXCEEDED_MESSAGE =
  'Voucher usage limit has been reached. Please refresh your cart.';

interface SubOrderGroup {
  subTotal: number;
  items: EnrichedCartItem[];
}

interface ExecuteCheckoutTransactionParams {
  userId: string;
  cart: EnrichedCart;
  sellerGroups: Map<string, SubOrderGroup>;
  shippingAddress: Record<string, unknown>;
  giftOptions: GiftOptions;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string | null;
  paymentExpiresAt?: Date | null;
  idempotencyKey?: string | null;
  rewardRedemption: RewardRedemption;
}

interface CheckoutFingerprintContext {
  userId: string;
  paymentMethod: PaymentMethod;
  cart: EnrichedCart;
  shippingAddress: Record<string, unknown>;
  giftOptions: GiftOptions;
  rewardRedemption: RewardRedemption;
}

interface CheckoutReuseValidationContext {
  expectedFingerprint?: string;
  shippingAddressHash?: string;
  giftOptionsHash?: string;
  currentCartItems?: CheckoutCartComparisonItem[];
}

interface CheckoutCartComparisonItem {
  productId: string;
  quantity: number;
  personalization: Prisma.JsonValue | null;
}

interface CheckoutFlashSalePricingSnapshot {
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  flashSaleId: string | null;
  reserveStock: number;
}

interface RewardRedemption {
  points: number;
  discountAmount: number;
}

interface GiftOptions {
  giftWrap: boolean;
  giftCard: boolean;
  giftMessage: string | null;
}

interface CheckoutVoucherSnapshot {
  voucherId: string;
}

interface FlashSaleReservationGroup {
  flashSaleId: string;
  quantity: number;
}

interface FlashSaleOrderItemSnapshot {
  quantity: number;
  flashSaleId: string | null;
  flashSaleDiscountPercent: Prisma.Decimal | number | null;
}

interface FlashSaleSubOrderSnapshot {
  id: string;
  status: OrderStatus;
  items: FlashSaleOrderItemSnapshot[];
}

interface PaymentIntentSnapshot {
  id: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

interface StripeWebhookPaymentPayload {
  eventId: string;
  paymentIntentId: string;
  type: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
}

type OrderWithStockItems = Prisma.OrderGetPayload<{
  include: {
    subOrders: {
      include: {
        items: {
          select: {
            productId: true;
            quantity: true;
          };
        };
      };
    };
  };
}>;

type OrderWithCheckoutSnapshot = Prisma.OrderGetPayload<{
  include: {
    subOrders: {
      include: {
        items: {
          select: {
            productId: true;
            quantity: true;
            price: true;
            originalPrice: true;
            platformDiscountAmount: true;
            personalization: true;
          };
        };
      };
    };
  };
}>;

type OrderWithFinancialRelations = Prisma.OrderGetPayload<{
  include: {
    subOrders: {
      include: {
        items: true;
      };
    };
    refunds: true;
  };
}>;

interface AdminOrderFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  customer?: string;
  seller?: string;
}

type CustomOrderSummary = {
  id: string;
  sellerId: string;
  seller?: unknown;
  customer?: unknown;
  price: Prisma.Decimal | number;
  title: string;
  sketchImageUrl: string | null;
  status: CustomOrderStatus;
  paymentStatus?: PaymentStatus | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private expiredOrderSweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly cartService: CartService,
    private readonly settingsService: SettingsService,
    private readonly rewardsService: RewardsService,
    private readonly vouchersService: VouchersService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  onModuleInit() {
    this.expiredOrderSweepTimer = setInterval(
      () => void this.releaseExpiredStripeOrders(),
      EXPIRED_ORDER_SWEEP_MS,
    );
    this.expiredOrderSweepTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.expiredOrderSweepTimer) {
      clearInterval(this.expiredOrderSweepTimer);
    }
  }

  private getPlatformCommissionBps() {
    return (
      this.settingsService?.getPlatformCommissionBps() ??
      DEFAULT_PLATFORM_COMMISSION_BPS
    );
  }

  private roundMoney(amount: number) {
    return Math.round(amount);
  }

  private calculateSubOrderGross(
    items: Array<{
      quantity: number;
      price: Prisma.Decimal | number;
      originalPrice?: Prisma.Decimal | number;
    }>,
  ) {
    return items.reduce((sum, item) => {
      const originalPrice =
        item.originalPrice === undefined || Number(item.originalPrice) === 0
          ? Number(item.price)
          : Number(item.originalPrice);
      return sum + originalPrice * item.quantity;
    }, 0);
  }

  private calculateSubOrderPlatformDiscount(subOrder: {
    subTotal?: Prisma.Decimal | number;
    discountAmount: Prisma.Decimal | number;
    items: Array<{
      quantity: number;
      price: Prisma.Decimal | number;
      originalPrice?: Prisma.Decimal | number;
    }>;
  }) {
    const gross = this.calculateSubOrderGross(subOrder.items);
    const paidLineTotal = subOrder.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    return this.roundMoney(
      Math.max(0, gross - paidLineTotal + Number(subOrder.discountAmount)),
    );
  }

  private calculateSubOrderCustomerPaid(subOrder: {
    subTotal: Prisma.Decimal | number;
    discountAmount: Prisma.Decimal | number;
  }) {
    return this.roundMoney(
      Math.max(0, Number(subOrder.subTotal) - Number(subOrder.discountAmount)),
    );
  }

  private calculatePlatformFee(gross: number) {
    return this.roundMoney((gross * this.getPlatformCommissionBps()) / 10000);
  }

  private calculateRefundedAmount(
    refunds: Array<{ amount: Prisma.Decimal | number; status: RefundStatus }>,
  ) {
    return refunds
      .filter((refund) => refund.status === RefundStatus.SUCCEEDED)
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
  }

  private calculateOrderFinancialSummary(order: OrderWithFinancialRelations) {
    const gross = order.subOrders.reduce(
      (sum, subOrder) => sum + this.calculateSubOrderGross(subOrder.items),
      0,
    );
    const platformDiscount = order.subOrders.reduce(
      (sum, subOrder) => sum + this.calculateSubOrderPlatformDiscount(subOrder),
      0,
    );
    const platformFee = this.calculatePlatformFee(gross);
    const refundedAmount = this.calculateRefundedAmount(order.refunds);
    const sellerNetBeforeRefunds = this.roundMoney(
      Math.max(0, gross - platformFee),
    );
    const refundedRatio =
      Number(order.totalAmount) > 0
        ? Math.min(refundedAmount / Number(order.totalAmount), 1)
        : 0;

    return {
      gross: this.roundMoney(gross),
      customerPaid: Number(order.totalAmount),
      platformDiscount: this.roundMoney(platformDiscount),
      platformFee,
      sellerNet: this.roundMoney(
        Math.max(0, sellerNetBeforeRefunds * (1 - refundedRatio)),
      ),
      refundedAmount,
    };
  }

  private attachFinancialSummary<T extends OrderWithFinancialRelations>(
    order: T,
  ) {
    return {
      ...order,
      financialSummary: this.calculateOrderFinancialSummary(order),
    };
  }

  async checkout(
    userId: string,
    checkoutDto: CheckoutDto,
    paymentMethod: PaymentMethod = PaymentMethod.STRIPE,
  ) {
    await this.releaseExpiredStripeOrders();

    const normalizedPaymentMethod = this.normalizePaymentMethod(paymentMethod);
    const providedIdempotencyKey =
      checkoutDto.idempotencyKey?.trim() || undefined;

    const shippingAddress = await this.resolveCheckoutShippingAddress(
      userId,
      checkoutDto,
    );
    const giftOptions = this.normalizeCheckoutGiftOptions(checkoutDto);
    let currentCartItemsForProvidedKey:
      | CheckoutCartComparisonItem[]
      | undefined;

    if (providedIdempotencyKey) {
      currentCartItemsForProvidedKey =
        await this.getCurrentCartComparisonItems(userId);

      if (currentCartItemsForProvidedKey.length === 0) {
        const reusableCheckout = await this.findReusableCheckoutResponse(
          userId,
          providedIdempotencyKey,
          normalizedPaymentMethod,
          {
            shippingAddressHash: this.hashCheckoutValue(shippingAddress),
            giftOptionsHash: this.hashCheckoutValue(giftOptions),
          },
        );
        if (reusableCheckout) {
          return reusableCheckout;
        }
      }
    }

    const cart = await this.cartService.getCart(userId);
    this.validateCart(cart);

    const rewardPointsToRedeem = this.rewardsService.normalizePoints(
      checkoutDto.rewardPointsToRedeem,
    );
    const rewardRedemption = this.rewardsService.calculateRedemption(
      rewardPointsToRedeem,
      cart.total + SHIPPING_FEE,
    );
    const checkoutCart = this.applyRewardDiscountToCart(
      cart,
      rewardRedemption.discountAmount,
    );
    const sellerGroups = this.groupItemsBySeller(cart.items);
    const checkoutFingerprint = this.buildCheckoutFingerprint({
      userId,
      paymentMethod: normalizedPaymentMethod,
      cart: checkoutCart,
      shippingAddress,
      giftOptions,
      rewardRedemption,
    });
    const idempotencyKey =
      providedIdempotencyKey ??
      this.buildServerCheckoutIdempotencyKey(checkoutFingerprint);
    const reuseValidation: CheckoutReuseValidationContext = {
      expectedFingerprint: checkoutFingerprint,
      shippingAddressHash: this.hashCheckoutValue(shippingAddress),
      giftOptionsHash: this.hashCheckoutValue(giftOptions),
      currentCartItems:
        currentCartItemsForProvidedKey ??
        this.getCartComparisonItems(cart.items),
    };

    const reusableCheckout = await this.findReusableCheckoutResponse(
      userId,
      idempotencyKey,
      normalizedPaymentMethod,
      reuseValidation,
    );
    if (reusableCheckout) {
      return reusableCheckout;
    }

    if (normalizedPaymentMethod === PaymentMethod.COD) {
      let order: Order;
      try {
        order = await this.executeCheckoutTransaction({
          userId,
          cart: checkoutCart,
          sellerGroups,
          shippingAddress,
          giftOptions,
          paymentMethod: PaymentMethod.COD,
          paymentStatus: PaymentStatus.COD_PENDING,
          idempotencyKey,
          rewardRedemption,
        });
      } catch (error) {
        const recovered = await this.recoverReusableCheckoutFromConflict(
          error,
          userId,
          idempotencyKey,
          normalizedPaymentMethod,
          reuseValidation,
        );
        if (recovered) {
          return recovered;
        }
        throw error;
      }

      await this.notifyOrderCreated(order.id);

      return {
        orderId: order.id,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: order.paymentStatus,
        expiresAt: null,
        requiresPayment: false,
      };
    }

    const finalTotal = checkoutCart.total + SHIPPING_FEE;

    const paymentIntent = await this.stripeService.createPaymentIntent(
      finalTotal,
      'vnd',
      {
        userId,
        voucherCode: checkoutCart.appliedVoucher?.code || '',
        rewardPointsRedeemed: String(rewardRedemption.points),
      },
    );

    let order: Order;
    try {
      order = await this.executeCheckoutTransaction({
        userId,
        cart: checkoutCart,
        sellerGroups,
        shippingAddress,
        giftOptions,
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.UNPAID,
        paymentIntentId: paymentIntent.id,
        paymentExpiresAt: new Date(Date.now() + STRIPE_PAYMENT_EXPIRY_MS),
        idempotencyKey,
        rewardRedemption,
      });
    } catch (error) {
      await this.stripeService.cancelPaymentIntent(paymentIntent.id);
      const recovered = await this.recoverReusableCheckoutFromConflict(
        error,
        userId,
        idempotencyKey,
        normalizedPaymentMethod,
        reuseValidation,
      );
      if (recovered) {
        return recovered;
      }
      throw error;
    }

    await this.stripeService.updatePaymentIntentMetadata(paymentIntent.id, {
      orderId: order.id,
      userId,
      voucherCode: checkoutCart.appliedVoucher?.code || '',
      rewardPointsRedeemed: String(rewardRedemption.points),
    });

    await this.notifyOrderCreated(order.id);

    return {
      clientSecret: paymentIntent.client_secret as string,
      orderId: order.id,
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: order.paymentStatus,
      expiresAt: order.paymentExpiresAt,
      requiresPayment: true,
    };
  }

  private async findReusableCheckoutResponse(
    userId: string,
    idempotencyKey: string | undefined,
    requestedPaymentMethod: PaymentMethod,
    validation?: CheckoutReuseValidationContext,
  ) {
    if (!idempotencyKey) {
      return null;
    }

    const order = await this.prisma.order.findFirst({
      where: {
        customerId: userId,
        checkoutIdempotencyKey: idempotencyKey,
      },
      include: {
        subOrders: {
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
                price: true,
                originalPrice: true,
                platformDiscountAmount: true,
                personalization: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!order || order.status === OrderStatus.CANCELLED) {
      return null;
    }

    if (order.paymentMethod !== requestedPaymentMethod) {
      throw new BadRequestException(
        'Idempotency key was used with another payment method',
      );
    }

    this.assertReusableCheckoutMatchesRequest(order, validation);

    if (order.paymentMethod === PaymentMethod.COD) {
      return {
        orderId: order.id,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: order.paymentStatus,
        expiresAt: null,
        requiresPayment: false,
      };
    }

    if (
      order.paymentStatus === PaymentStatus.UNPAID &&
      order.paymentIntentId &&
      order.paymentExpiresAt &&
      order.paymentExpiresAt > new Date()
    ) {
      const intent = await this.stripeService.retrievePaymentIntent(
        order.paymentIntentId,
      );
      return {
        clientSecret: intent.client_secret as string,
        orderId: order.id,
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: order.paymentStatus,
        expiresAt: order.paymentExpiresAt,
        requiresPayment: true,
      };
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      return {
        orderId: order.id,
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: order.paymentStatus,
        expiresAt: null,
        requiresPayment: false,
      };
    }

    return null;
  }

  private assertReusableCheckoutMatchesRequest(
    order: OrderWithCheckoutSnapshot,
    validation?: CheckoutReuseValidationContext,
  ) {
    if (!validation) {
      return;
    }

    if (
      validation.shippingAddressHash &&
      this.hashCheckoutValue(order.shippingAddress ?? null) !==
        validation.shippingAddressHash
    ) {
      throw new BadRequestException(
        'Idempotency key was used with another checkout payload',
      );
    }

    if (
      validation.giftOptionsHash &&
      this.hashCheckoutValue(this.getOrderGiftOptions(order)) !==
        validation.giftOptionsHash
    ) {
      throw new BadRequestException(
        'Idempotency key was used with another checkout payload',
      );
    }

    if (
      validation.expectedFingerprint &&
      this.buildExistingOrderFingerprint(order) !==
        validation.expectedFingerprint
    ) {
      throw new BadRequestException(
        'Idempotency key was used with another checkout payload',
      );
    }

    if (
      !validation.expectedFingerprint &&
      validation.currentCartItems &&
      validation.currentCartItems.length > 0 &&
      !this.areCheckoutItemsEquivalent(
        validation.currentCartItems,
        this.getOrderComparisonItems(order),
      )
    ) {
      throw new BadRequestException(
        'Idempotency key was used with another checkout payload',
      );
    }
  }

  private async recoverReusableCheckoutFromConflict(
    error: unknown,
    userId: string,
    idempotencyKey: string,
    requestedPaymentMethod: PaymentMethod,
    validation: CheckoutReuseValidationContext,
  ) {
    if (!this.isCheckoutIdempotencyConflict(error)) {
      return null;
    }

    const reusable = await this.findReusableCheckoutResponse(
      userId,
      idempotencyKey,
      requestedPaymentMethod,
      validation,
    );

    if (!reusable) {
      throw new BadRequestException('Checkout is already being processed');
    }

    return reusable;
  }

  private normalizePaymentMethod(paymentMethod: PaymentMethod): PaymentMethod {
    if (
      paymentMethod !== PaymentMethod.STRIPE &&
      paymentMethod !== PaymentMethod.COD
    ) {
      throw new BadRequestException('Invalid payment method');
    }

    return paymentMethod;
  }

  private buildServerCheckoutIdempotencyKey(fingerprint: string) {
    return `server:${fingerprint}`;
  }

  private buildCheckoutFingerprint(context: CheckoutFingerprintContext) {
    return this.hashCheckoutValue({
      userId: context.userId,
      paymentMethod: context.paymentMethod,
      voucherCode: context.cart.appliedVoucher?.code ?? null,
      orderTotal: this.toCheckoutMoney(context.cart.total + SHIPPING_FEE),
      discountAmount: this.toCheckoutMoney(context.cart.discountAmount),
      ...(context.rewardRedemption.points > 0 ||
      context.rewardRedemption.discountAmount > 0
        ? {
            rewardPointsRedeemed: context.rewardRedemption.points,
            rewardDiscountAmount: this.toCheckoutMoney(
              context.rewardRedemption.discountAmount,
            ),
          }
        : {}),
      shippingAddressHash: this.hashCheckoutValue(context.shippingAddress),
      giftOptions: context.giftOptions,
      items: this.getCheckoutFingerprintItems(context.cart.items),
    });
  }

  private buildExistingOrderFingerprint(order: OrderWithCheckoutSnapshot) {
    const rewardPointsRedeemed = order.rewardPointsRedeemed ?? 0;
    const rewardDiscountAmount = this.toCheckoutMoney(
      order.rewardDiscountAmount ?? 0,
    );

    return this.hashCheckoutValue({
      userId: order.customerId,
      paymentMethod: order.paymentMethod,
      voucherCode: order.voucherCode ?? null,
      orderTotal: this.toCheckoutMoney(order.totalAmount),
      discountAmount: this.toCheckoutMoney(order.discountAmount),
      ...(rewardPointsRedeemed > 0 || rewardDiscountAmount > 0
        ? { rewardPointsRedeemed, rewardDiscountAmount }
        : {}),
      shippingAddressHash: this.hashCheckoutValue(
        order.shippingAddress ?? null,
      ),
      giftOptions: this.getOrderGiftOptions(order),
      items: this.getExistingOrderFingerprintItems(order),
    });
  }

  private getCheckoutFingerprintItems(items: EnrichedCartItem[]) {
    return items
      .map((item) => {
        const discountedPrice = this.toCheckoutMoney(
          item.pricing.discountedPrice,
        );
        const originalPrice = this.toCheckoutMoney(
          item.pricing.originalPrice ?? item.pricing.discountedPrice,
        );

        return {
          productId: item.productId,
          quantity: item.quantity,
          price: discountedPrice,
          originalPrice,
          platformDiscountAmount: this.toCheckoutMoney(
            Math.max(0, originalPrice - discountedPrice),
          ),
          personalization: item.personalization ?? null,
        };
      })
      .sort((a, b) => a.productId.localeCompare(b.productId));
  }

  private getExistingOrderFingerprintItems(order: OrderWithCheckoutSnapshot) {
    return order.subOrders
      .flatMap((subOrder) => subOrder.items)
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: this.toCheckoutMoney(item.price),
        originalPrice: this.toCheckoutMoney(item.originalPrice),
        platformDiscountAmount: this.toCheckoutMoney(
          item.platformDiscountAmount,
        ),
        personalization: item.personalization ?? null,
      }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
  }

  private getCartComparisonItems(items: EnrichedCartItem[]) {
    return items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      personalization: item.personalization ?? null,
    }));
  }

  private getOrderComparisonItems(order: OrderWithCheckoutSnapshot) {
    return order.subOrders.flatMap((subOrder) =>
      subOrder.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        personalization: item.personalization ?? null,
      })),
    );
  }

  private async getCurrentCartComparisonItems(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: {
        items: {
          select: {
            productId: true,
            quantity: true,
            personalization: true,
          },
        },
      },
    });

    return cart?.items ?? [];
  }

  private areCheckoutItemsEquivalent(
    left: CheckoutCartComparisonItem[],
    right: CheckoutCartComparisonItem[],
  ) {
    const normalize = (items: CheckoutCartComparisonItem[]) =>
      items
        .map((item) =>
          this.hashCheckoutValue({
            productId: item.productId,
            quantity: item.quantity,
            personalization: item.personalization ?? null,
          }),
        )
        .sort()
        .join('|');

    return normalize(left) === normalize(right);
  }

  private toCheckoutMoney(value: Prisma.Decimal | number | null | undefined) {
    return this.roundMoney(Number(value ?? 0));
  }

  private hashCheckoutValue(value: unknown) {
    return createHash('sha256')
      .update(JSON.stringify(this.normalizeCheckoutValue(value)))
      .digest('hex');
  }

  private normalizeCheckoutValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeCheckoutValue(item));
    }

    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((normalized, key) => {
          const nestedValue = (value as Record<string, unknown>)[key];
          if (nestedValue !== undefined) {
            normalized[key] = this.normalizeCheckoutValue(nestedValue);
          }
          return normalized;
        }, {});
    }

    return value;
  }

  private async resolveCheckoutShippingAddress(
    userId: string,
    checkoutDto: CheckoutDto,
  ): Promise<Record<string, unknown>> {
    if (checkoutDto.addressId) {
      const address = await this.prisma.address.findFirst({
        where: {
          id: checkoutDto.addressId,
          userId,
          deletedAt: null,
        },
      });

      if (!address) {
        throw new NotFoundException('Shipping address not found');
      }

      return {
        addressId: address.id,
        fullName: address.fullName,
        phone: address.phone,
        address: address.address,
        city: address.city,
        district: address.district,
        ward: address.ward,
      };
    }

    if (checkoutDto.shippingAddress) {
      return { ...checkoutDto.shippingAddress };
    }

    throw new BadRequestException('Shipping address is required');
  }

  private normalizeCheckoutGiftOptions(checkoutDto: CheckoutDto): GiftOptions {
    const giftWrap = checkoutDto.giftWrap === true;
    const rawMessage =
      typeof checkoutDto.giftMessage === 'string'
        ? checkoutDto.giftMessage
        : '';
    const giftMessage = rawMessage
      .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();

    if (giftMessage.length > 500) {
      throw new BadRequestException(
        'Gift message must be at most 500 characters',
      );
    }

    const giftCard = checkoutDto.giftCard === true || giftMessage.length > 0;

    return {
      giftWrap,
      giftCard,
      giftMessage: giftCard && giftMessage ? giftMessage : null,
    };
  }

  private getOrderGiftOptions(
    order: Pick<Order, 'giftWrap' | 'giftCard' | 'giftMessage'>,
  ): GiftOptions {
    return {
      giftWrap: Boolean(order.giftWrap),
      giftCard: Boolean(order.giftCard),
      giftMessage:
        typeof order.giftMessage === 'string' && order.giftMessage.trim()
          ? order.giftMessage.trim()
          : null,
    };
  }

  private validateCart(cart: EnrichedCart) {
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      const isPurchasable =
        item.product.status === ProductStatus.APPROVED &&
        item.product.category.status === CategoryStatus.ACTIVE &&
        item.product.deletedAt === null &&
        item.product.category.deletedAt === null;

      if (!isPurchasable) {
        throw new BadRequestException(
          `Product ${item.product.name} is not available for purchase`,
        );
      }

      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Product ${item.product.name} is out of stock (Available: ${item.product.stock})`,
        );
      }
    }
  }

  private groupItemsBySeller(
    items: EnrichedCartItem[],
  ): Map<string, SubOrderGroup> {
    const groups = new Map<string, SubOrderGroup>();
    for (const item of items) {
      const sellerId = item.product.sellerId;
      if (!groups.has(sellerId)) {
        groups.set(sellerId, { subTotal: 0, items: [] });
      }
      const group = groups.get(sellerId)!;
      group.subTotal += item.pricing.discountedPrice * item.quantity;
      group.items.push(item);
    }
    return groups;
  }

  private applyRewardDiscountToCart(
    cart: EnrichedCart,
    rewardDiscountAmount: number,
  ): EnrichedCart {
    if (rewardDiscountAmount <= 0) {
      return cart;
    }

    return {
      ...cart,
      discountAmount: this.roundMoney(
        Number(cart.discountAmount) + rewardDiscountAmount,
      ),
      total: this.roundMoney(
        Math.max(0, Number(cart.total) - rewardDiscountAmount),
      ),
    };
  }

  private async executeCheckoutTransaction(
    params: ExecuteCheckoutTransactionParams,
  ): Promise<Order> {
    const {
      userId,
      cart,
      sellerGroups,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      paymentIntentId,
      paymentExpiresAt,
      idempotencyKey,
      rewardRedemption,
      giftOptions,
    } = params;

    return this.prisma.$transaction(async (tx) => {
      const voucherSnapshot = await this.revalidateVoucherForCheckout(
        tx,
        userId,
        cart,
      );
      const flashSaleSnapshots = this.isFlashSaleGuardrailsEnabled()
        ? await this.revalidateFlashSalePricing(tx, cart)
        : undefined;
      const flashSaleReservationGroups = flashSaleSnapshots
        ? this.buildFlashSaleReservationGroups(cart, flashSaleSnapshots)
        : [];

      await this.reserveFlashSaleUnits(tx, flashSaleReservationGroups);
      await this.reserveFlashSaleUserUsage(
        tx,
        userId,
        flashSaleReservationGroups,
      );
      await this.updateStock(tx, cart.items, flashSaleSnapshots);

      const order = await tx.order.create({
        data: {
          customerId: userId,
          totalAmount: cart.total + SHIPPING_FEE,
          discountAmount: cart.discountAmount,
          rewardPointsRedeemed: rewardRedemption.points,
          rewardDiscountAmount: rewardRedemption.discountAmount,
          voucherCode: cart.appliedVoucher?.code,
          paymentMethod,
          paymentStatus,
          paymentIntentId: paymentIntentId ?? null,
          paymentExpiresAt: paymentExpiresAt ?? null,
          checkoutIdempotencyKey: idempotencyKey ?? null,
          currency: CURRENCY,
          shippingAddress: shippingAddress
            ? (shippingAddress as Prisma.InputJsonValue)
            : undefined,
          giftWrap: giftOptions.giftWrap,
          giftCard: giftOptions.giftCard,
          giftMessage: giftOptions.giftMessage,
          status: OrderStatus.PENDING,
        },
      });

      await this.createSubOrders(
        tx,
        order.id,
        cart,
        sellerGroups,
        flashSaleSnapshots,
      );

      await this.rewardsService.redeemForOrder(
        tx,
        userId,
        order.id,
        rewardRedemption.points,
      );

      await this.recordVoucherUsage(tx, userId, order.id, voucherSnapshot);

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { appliedVoucherId: null },
      });

      return order;
    });
  }

  private async revalidateVoucherForCheckout(
    tx: Prisma.TransactionClient,
    userId: string,
    cart: EnrichedCart,
  ): Promise<CheckoutVoucherSnapshot | null> {
    if (!cart.appliedVoucher) {
      return null;
    }

    const now = new Date();
    const voucher = await tx.voucher.findFirst({
      where: {
        code: cart.appliedVoucher.code,
        deletedAt: null,
        isActive: true,
        endDate: { gt: now },
        category: {
          deletedAt: null,
          status: CategoryStatus.ACTIVE,
        },
        ranges: {
          some: {
            deletedAt: null,
            endDate: { gt: now },
          },
        },
        OR: [
          { sellerId: null },
          {
            seller: {
              deletedAt: null,
              status: UserStatus.ACTIVE,
              roles: { has: Role.ROLE_SELLER },
            },
          },
        ],
      },
      include: {
        ranges: {
          where: {
            deletedAt: null,
            endDate: { gt: now },
          },
        },
        category: true,
      },
    });

    if (!voucher) {
      throw new BadRequestException(VOUCHER_INVALID_MESSAGE);
    }

    await this.vouchersService.assertVoucherUsageAvailable(
      voucher,
      userId,
      tx,
    );

    const eligibleSubtotal = this.calculateVoucherEligibleSubtotal(
      cart.items,
      voucher,
    );
    const matchedRange = this.vouchersService.findMatchingRange(
      voucher.ranges,
      eligibleSubtotal,
      now,
    );

    if (!matchedRange) {
      throw new BadRequestException(VOUCHER_INVALID_MESSAGE);
    }

    const discountAmount = this.vouchersService.calculateDiscountAmount(
      voucher,
      matchedRange,
      eligibleSubtotal,
    );

    if (
      discountAmount !== cart.appliedVoucher.discountAmount ||
      discountAmount > eligibleSubtotal ||
      discountAmount > cart.subtotal
    ) {
      throw new BadRequestException(VOUCHER_PRICING_CHANGED_MESSAGE);
    }

    return {
      voucherId: voucher.id,
    };
  }

  private calculateVoucherEligibleSubtotal(
    items: EnrichedCartItem[],
    voucher: { categoryId: string; sellerId?: string | null },
  ) {
    return items
      .filter((item) => this.isVoucherItemEligible(item, voucher))
      .reduce(
        (sum, item) => sum + item.pricing.discountedPrice * item.quantity,
        0,
      );
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

  private async recordVoucherUsage(
    tx: Prisma.TransactionClient,
    userId: string,
    orderId: string,
    voucherSnapshot: CheckoutVoucherSnapshot | null,
  ) {
    if (!voucherSnapshot) {
      return;
    }

    const usageRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO "VoucherUsage" (
        "id",
        "voucherId",
        "userId",
        "orderId",
        "createdAt"
      )
      SELECT
        ${randomUUID()},
        ${voucherSnapshot.voucherId},
        ${userId},
        ${orderId},
        NOW()
      WHERE EXISTS (
        SELECT 1
        FROM "Voucher"
        WHERE "id" = ${voucherSnapshot.voucherId}
          AND "deletedAt" IS NULL
          AND "isActive" = true
          AND "endDate" > (NOW() AT TIME ZONE 'UTC')
          AND (
            "perUserLimit" IS NULL
            OR (
              SELECT COUNT(*)
              FROM "VoucherUsage"
              WHERE "voucherId" = ${voucherSnapshot.voucherId}
                AND "userId" = ${userId}
            ) < "perUserLimit"
          )
      )
      ON CONFLICT ("orderId") DO NOTHING
      RETURNING "id"
    `);

    if (usageRows.length !== 1) {
      throw new BadRequestException(VOUCHER_USAGE_LIMIT_EXCEEDED_MESSAGE);
    }

    const voucherRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      UPDATE "Voucher"
      SET "usedCount" = "usedCount" + 1
      WHERE "id" = ${voucherSnapshot.voucherId}
        AND "deletedAt" IS NULL
        AND "isActive" = true
        AND "endDate" > (NOW() AT TIME ZONE 'UTC')
        AND (
          "usageLimit" IS NULL
          OR "usedCount" + 1 <= "usageLimit"
        )
      RETURNING "id"
    `);

    if (voucherRows.length !== 1) {
      throw new BadRequestException(VOUCHER_USAGE_LIMIT_EXCEEDED_MESSAGE);
    }
  }

  private isFlashSaleGuardrailsEnabled() {
    return process.env.FLASH_SALE_GUARDRAILS_ENABLED === 'true';
  }

  private async revalidateFlashSalePricing(
    tx: Prisma.TransactionClient,
    cart: EnrichedCart,
  ) {
    const snapshots = new Map<string, CheckoutFlashSalePricingSnapshot>();

    for (const item of cart.items) {
      const currentPricing = await this.calculateTransactionalFlashSalePricing(
        tx,
        item.productId,
      );

      if (!this.isCartPricingSnapshotCurrent(item, currentPricing)) {
        throw new BadRequestException(CART_PRICING_CHANGED_MESSAGE);
      }

      snapshots.set(item.productId, currentPricing);
    }

    return snapshots;
  }

  private buildFlashSaleReservationGroups(
    cart: EnrichedCart,
    flashSaleSnapshots: Map<string, CheckoutFlashSalePricingSnapshot>,
  ): FlashSaleReservationGroup[] {
    const groups = new Map<string, number>();

    for (const item of cart.items) {
      const snapshot = flashSaleSnapshots.get(item.productId);
      if (!this.isDiscountedFlashSaleSnapshot(snapshot)) {
        continue;
      }

      groups.set(
        snapshot.flashSaleId,
        (groups.get(snapshot.flashSaleId) ?? 0) + item.quantity,
      );
    }

    return Array.from(groups.entries())
      .map(([flashSaleId, quantity]) => ({ flashSaleId, quantity }))
      .sort((a, b) => a.flashSaleId.localeCompare(b.flashSaleId));
  }

  private async reserveFlashSaleUnits(
    tx: Prisma.TransactionClient,
    groups: FlashSaleReservationGroup[],
  ) {
    for (const group of groups) {
      const reservedRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        UPDATE "FlashSale"
        SET "reservedUnits" = "reservedUnits" + ${group.quantity}
        WHERE "id" = ${group.flashSaleId}
          AND "isActive" = true
          AND "saleState" = 'ACTIVE'::"FlashSaleState"
          AND "startAt" <= (NOW() AT TIME ZONE 'UTC')
          AND "endAt" >= (NOW() AT TIME ZONE 'UTC')
          AND (
            "maxUnits" IS NULL
            OR "soldUnits" + "reservedUnits" + ${group.quantity} <= "maxUnits"
          )
        RETURNING "id"
      `);

      if (reservedRows.length !== 1) {
        throw new BadRequestException(FLASH_SALE_SOLD_OUT_MESSAGE);
      }
    }
  }

  private async reserveFlashSaleUserUsage(
    tx: Prisma.TransactionClient,
    userId: string,
    groups: FlashSaleReservationGroup[],
  ) {
    for (const group of groups) {
      const usageRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        INSERT INTO "FlashSaleUserUsage" (
          "id",
          "flashSaleId",
          "userId",
          "soldUnits",
          "reservedUnits",
          "createdAt",
          "updatedAt"
        )
        SELECT
          ${randomUUID()},
          ${group.flashSaleId},
          ${userId},
          0,
          ${group.quantity},
          NOW(),
          NOW()
        WHERE EXISTS (
          SELECT 1
          FROM "FlashSale"
          WHERE "id" = ${group.flashSaleId}
            AND "isActive" = true
            AND "saleState" = 'ACTIVE'::"FlashSaleState"
            AND "startAt" <= (NOW() AT TIME ZONE 'UTC')
            AND "endAt" >= (NOW() AT TIME ZONE 'UTC')
            AND (
              "perUserLimit" IS NULL
              OR ${group.quantity} <= "perUserLimit"
            )
        )
        ON CONFLICT ("flashSaleId", "userId")
        DO UPDATE SET
          "reservedUnits" =
            "FlashSaleUserUsage"."reservedUnits" + ${group.quantity},
          "updatedAt" = NOW()
        WHERE EXISTS (
          SELECT 1
          FROM "FlashSale"
          WHERE "id" = ${group.flashSaleId}
            AND "isActive" = true
            AND "saleState" = 'ACTIVE'::"FlashSaleState"
            AND "startAt" <= (NOW() AT TIME ZONE 'UTC')
            AND "endAt" >= (NOW() AT TIME ZONE 'UTC')
            AND (
              "perUserLimit" IS NULL
              OR "FlashSaleUserUsage"."soldUnits"
                + "FlashSaleUserUsage"."reservedUnits"
                + ${group.quantity} <= "perUserLimit"
            )
        )
        RETURNING "id"
      `);

      if (usageRows.length !== 1) {
        throw new BadRequestException(
          FLASH_SALE_PURCHASE_LIMIT_EXCEEDED_MESSAGE,
        );
      }
    }
  }

  private async calculateTransactionalFlashSalePricing(
    tx: Prisma.TransactionClient,
    productId: string,
  ): Promise<CheckoutFlashSalePricingSnapshot> {
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        status: ProductStatus.APPROVED,
        category: {
          deletedAt: null,
          status: CategoryStatus.ACTIVE,
        },
      },
      select: {
        price: true,
        categoryId: true,
      },
    });

    if (!product) {
      throw new BadRequestException(CART_PRICING_CHANGED_MESSAGE);
    }

    const originalPrice = this.toCheckoutMoney(product.price);
    const flashSale = await tx.flashSale.findFirst({
      where: {
        isActive: true,
        saleState: FlashSaleState.ACTIVE,
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
        categories: {
          some: { categoryId: product.categoryId },
        },
      },
      include: {
        ranges: true,
      },
    });

    if (!flashSale) {
      return {
        originalPrice,
        discountedPrice: originalPrice,
        discountPercent: 0,
        flashSaleId: null,
        reserveStock: 0,
      };
    }

    const matchedRange = flashSale.ranges.find(
      (range) =>
        originalPrice >= Number(range.minPrice) &&
        (range.maxPrice == null || originalPrice <= Number(range.maxPrice)),
    );

    if (!matchedRange) {
      return {
        originalPrice,
        discountedPrice: originalPrice,
        discountPercent: 0,
        flashSaleId: flashSale.id,
        reserveStock: 0,
      };
    }

    const discountPercent = Number(matchedRange.discountPercent);
    return {
      originalPrice,
      discountedPrice: this.roundMoney(
        originalPrice * (1 - discountPercent / 100),
      ),
      discountPercent,
      flashSaleId: flashSale.id,
      reserveStock:
        discountPercent > 0 ? Math.max(0, flashSale.reserveStock ?? 0) : 0,
    };
  }

  private isCartPricingSnapshotCurrent(
    item: EnrichedCartItem,
    currentPricing: CheckoutFlashSalePricingSnapshot,
  ) {
    const cartPricing = {
      originalPrice: this.toCheckoutMoney(
        item.pricing.originalPrice ?? item.product.price,
      ),
      discountedPrice: this.toCheckoutMoney(item.pricing.discountedPrice),
      discountPercent: Number(item.pricing.discountPercent ?? 0),
      flashSaleId: item.pricing.flashSaleId ?? null,
    };

    return (
      cartPricing.originalPrice === currentPricing.originalPrice &&
      cartPricing.discountedPrice === currentPricing.discountedPrice &&
      cartPricing.discountPercent === currentPricing.discountPercent &&
      cartPricing.flashSaleId === currentPricing.flashSaleId
    );
  }

  private async updateStock(
    tx: Prisma.TransactionClient,
    items: EnrichedCartItem[],
    flashSaleSnapshots?: Map<string, CheckoutFlashSalePricingSnapshot>,
  ) {
    const sortedItems = flashSaleSnapshots
      ? [...items].sort((a, b) => a.productId.localeCompare(b.productId))
      : items;

    for (const item of sortedItems) {
      const snapshot = flashSaleSnapshots?.get(item.productId);
      const stockThreshold = this.isDiscountedFlashSaleSnapshot(snapshot)
        ? item.quantity + snapshot.reserveStock
        : item.quantity;
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
          deletedAt: null,
          status: ProductStatus.APPROVED,
          stock: { gte: stockThreshold },
          category: {
            deletedAt: null,
            status: CategoryStatus.ACTIVE,
          },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (result.count !== 1) {
        if (this.isDiscountedFlashSaleSnapshot(snapshot)) {
          throw new BadRequestException(FLASH_SALE_INSUFFICIENT_STOCK_MESSAGE);
        }

        throw new BadRequestException(
          `Product ${item.product.name} is out of stock`,
        );
      }

      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          change: -item.quantity,
          reason: InventoryChangeReason.ORDER,
        },
      });
    }
  }

  private async createSubOrders(
    tx: Prisma.TransactionClient,
    orderId: string,
    cart: EnrichedCart,
    sellerGroups: Map<string, SubOrderGroup>,
    flashSaleSnapshots?: Map<string, CheckoutFlashSalePricingSnapshot>,
  ) {
    const groups = Array.from(sellerGroups.entries());
    let remainingDiscount = cart.discountAmount;
    const discountBases = new Map(
      groups.map(([sellerId, data]) => [
        sellerId,
        cart.appliedVoucher
          ? this.calculateVoucherEligibleSubtotal(data.items, cart.appliedVoucher)
          : data.subTotal,
      ]),
    );
    const totalDiscountBase = Array.from(discountBases.values()).reduce(
      (sum, value) => sum + value,
      0,
    );
    const discountableSellerIds = groups
      .filter(([sellerId]) => (discountBases.get(sellerId) ?? 0) > 0)
      .map(([sellerId]) => sellerId);
    const lastDiscountableSellerId =
      discountableSellerIds[discountableSellerIds.length - 1];

    for (let i = 0; i < groups.length; i++) {
      const [sellerId, data] = groups[i];
      const discountBase = discountBases.get(sellerId) ?? 0;

      const subOrderDiscount =
        cart.discountAmount > 0 && discountBase > 0 && totalDiscountBase > 0
          ? sellerId === lastDiscountableSellerId
            ? remainingDiscount
            : Math.round(cart.discountAmount * (discountBase / totalDiscountBase))
          : 0;

      remainingDiscount -= subOrderDiscount;

      const subOrder = await tx.subOrder.create({
        data: {
          orderId,
          sellerId,
          subTotal: data.subTotal,
          discountAmount: subOrderDiscount,
          status: 'PENDING',
        },
      });

      await tx.orderItem.createMany({
        data: data.items.map((item) => {
          const flashSaleSnapshot = flashSaleSnapshots?.get(item.productId);

          return {
            subOrderId: subOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.pricing.discountedPrice,
            originalPrice: item.pricing.originalPrice,
            platformDiscountAmount: Math.max(
              0,
              item.pricing.originalPrice - item.pricing.discountedPrice,
            ),
            personalization: item.personalization
              ? (item.personalization as Prisma.InputJsonValue)
              : undefined,
            ...(flashSaleSnapshots
              ? {
                  flashSaleId: flashSaleSnapshot?.flashSaleId ?? null,
                  flashSaleDiscountPercent:
                    flashSaleSnapshot?.discountPercent ?? 0,
                }
              : {}),
          };
        }),
      });
    }
  }

  private async notifyOrderCreated(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        totalAmount: true,
        subOrders: {
          select: {
            id: true,
            sellerId: true,
            subTotal: true,
          },
        },
      },
    });

    if (!order) {
      return;
    }

    if (!this.notificationsService) {
      return;
    }
    const notificationsService = this.notificationsService;

    await notificationsService.safeCreateForUser({
      userId: order.customerId,
      type: NotificationType.ORDER_CREATED,
      title: 'Đặt hàng thành công',
      message: `Đơn hàng #${order.id.slice(0, 8).toUpperCase()} đã được tạo thành công.`,
      link: `/profile/orders/${order.id}`,
      metadata: {
        orderId: order.id,
        totalAmount: Number(order.totalAmount),
      },
      dedupeKey: `order:${order.id}:created:customer:${order.customerId}`,
    });

    await Promise.all(
      order.subOrders.map((subOrder) =>
        notificationsService.safeCreateForUser({
          userId: subOrder.sellerId,
          type: NotificationType.ORDER_CREATED,
          title: 'Có đơn hàng mới',
          message: `Shop của bạn có kiện hàng mới từ đơn #${order.id.slice(0, 8).toUpperCase()}.`,
          link: '/dashboard/orders',
          metadata: {
            orderId: order.id,
            subOrderId: subOrder.id,
            subTotal: Number(subOrder.subTotal),
          },
          dedupeKey: `suborder:${subOrder.id}:created:seller:${subOrder.sellerId}`,
        }),
      ),
    );
  }

  private async notifySubOrderStatusChanged(params: {
    orderId: string;
    subOrderId: string;
    sellerId: string;
    customerId: string;
    status: OrderStatus;
    notifySeller?: boolean;
  }) {
    if (!this.notificationsService) {
      return;
    }
    const notificationsService = this.notificationsService;

    const type =
      params.status === OrderStatus.CANCELLED
        ? NotificationType.ORDER_CANCELLED
        : NotificationType.ORDER_STATUS_UPDATED;
    const orderCode = params.orderId.slice(0, 8).toUpperCase();
    const statusLabel = this.getOrderStatusLabel(params.status);

    await notificationsService.safeCreateForUser({
      userId: params.customerId,
      type,
      title:
        params.status === OrderStatus.CANCELLED
          ? 'Đơn hàng đã bị hủy'
          : 'Đơn hàng đã cập nhật trạng thái',
      message: `Kiện hàng trong đơn #${orderCode} hiện là "${statusLabel}".`,
      link: `/profile/orders/${params.orderId}`,
      metadata: {
        orderId: params.orderId,
        subOrderId: params.subOrderId,
        status: params.status,
      },
      dedupeKey: `suborder:${params.subOrderId}:status:${params.status}:user:${params.customerId}`,
    });

    if (params.notifySeller) {
      await notificationsService.safeCreateForUser({
        userId: params.sellerId,
        type,
        title:
          params.status === OrderStatus.CANCELLED
            ? 'Kiện hàng đã bị hủy'
            : 'Kiện hàng đã cập nhật trạng thái',
        message: `Kiện hàng #${params.subOrderId.slice(0, 8).toUpperCase()} trong đơn #${orderCode} hiện là "${statusLabel}".`,
        link: '/dashboard/orders',
        metadata: {
          orderId: params.orderId,
          subOrderId: params.subOrderId,
          status: params.status,
        },
        dedupeKey: `suborder:${params.subOrderId}:status:${params.status}:user:${params.sellerId}`,
      });
    }
  }

  private async notifyOrderCancelledByCustomer(order: {
    id: string;
    customerId: string;
    subOrders: Array<{ id: string; sellerId: string }>;
  }) {
    if (!this.notificationsService) {
      return;
    }
    const notificationsService = this.notificationsService;

    await Promise.all(
      order.subOrders.map((subOrder) =>
        notificationsService.safeCreateForUser({
          userId: subOrder.sellerId,
          type: NotificationType.ORDER_CANCELLED,
          title: 'Khách đã hủy đơn hàng',
          message: `Đơn #${order.id.slice(0, 8).toUpperCase()} có kiện hàng của shop đã bị khách hủy.`,
          link: '/dashboard/orders',
          metadata: {
            orderId: order.id,
            subOrderId: subOrder.id,
            customerId: order.customerId,
          },
          dedupeKey: `suborder:${subOrder.id}:cancelled:seller:${subOrder.sellerId}`,
        }),
      ),
    );
  }

  private getOrderStatusLabel(status: OrderStatus) {
    const labels: Record<OrderStatus, string> = {
      PENDING: 'Chờ xác nhận',
      PAID: 'Đã thanh toán',
      PROCESSING: 'Đang xử lý',
      SHIPPED: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy',
    };

    return labels[status] ?? status;
  }

  private isDiscountedFlashSaleSnapshot(
    snapshot: CheckoutFlashSalePricingSnapshot | undefined,
  ): snapshot is CheckoutFlashSalePricingSnapshot & { flashSaleId: string } {
    return Boolean(
      snapshot?.flashSaleId && Number(snapshot.discountPercent) > 0,
    );
  }

  private aggregateDiscountedFlashSaleOrderItems(
    subOrders: FlashSaleSubOrderSnapshot[],
  ): FlashSaleReservationGroup[] {
    const groups = new Map<string, number>();

    for (const subOrder of subOrders) {
      for (const item of subOrder.items) {
        if (
          !item.flashSaleId ||
          Number(item.flashSaleDiscountPercent ?? 0) <= 0
        ) {
          continue;
        }

        groups.set(
          item.flashSaleId,
          (groups.get(item.flashSaleId) ?? 0) + item.quantity,
        );
      }
    }

    return Array.from(groups.entries())
      .map(([flashSaleId, quantity]) => ({ flashSaleId, quantity }))
      .sort((a, b) => a.flashSaleId.localeCompare(b.flashSaleId));
  }

  private async getDiscountedFlashSaleOrderItemGroups(
    tx: Prisma.TransactionClient,
    orderId: string,
    customerId: string,
    subOrderIds?: string[],
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        customerId: true,
        subOrders: {
          where: subOrderIds
            ? { id: { in: subOrderIds } }
            : { status: { not: OrderStatus.CANCELLED } },
          select: {
            id: true,
            status: true,
            items: {
              select: {
                quantity: true,
                flashSaleId: true,
                flashSaleDiscountPercent: true,
              },
            },
          },
        },
      },
    });

    if (!order || order.customerId !== customerId) {
      throw new InternalServerErrorException(
        FLASH_SALE_COUNTER_STATE_INCONSISTENT_MESSAGE,
      );
    }

    return this.aggregateDiscountedFlashSaleOrderItems(order.subOrders);
  }

  private assertFlashSaleCounterUpdate(updatedCount: number) {
    if (updatedCount !== 1) {
      throw new InternalServerErrorException(
        FLASH_SALE_COUNTER_STATE_INCONSISTENT_MESSAGE,
      );
    }
  }

  private async convertFlashSaleReservationsToSold(
    tx: Prisma.TransactionClient,
    orderId: string,
    customerId: string,
  ) {
    if (!this.isFlashSaleGuardrailsEnabled()) {
      return;
    }

    const groups = await this.getDiscountedFlashSaleOrderItemGroups(
      tx,
      orderId,
      customerId,
    );

    for (const group of groups) {
      const saleUpdated = await tx.flashSale.updateMany({
        where: {
          id: group.flashSaleId,
          reservedUnits: { gte: group.quantity },
        },
        data: {
          reservedUnits: { decrement: group.quantity },
          soldUnits: { increment: group.quantity },
        },
      });
      this.assertFlashSaleCounterUpdate(saleUpdated.count);

      const usageUpdated = await tx.flashSaleUserUsage.updateMany({
        where: {
          flashSaleId: group.flashSaleId,
          userId: customerId,
          reservedUnits: { gte: group.quantity },
        },
        data: {
          reservedUnits: { decrement: group.quantity },
          soldUnits: { increment: group.quantity },
        },
      });
      this.assertFlashSaleCounterUpdate(usageUpdated.count);
    }
  }

  private async releaseFlashSaleReservations(
    tx: Prisma.TransactionClient,
    orderId: string,
    customerId: string,
    subOrderIds?: string[],
  ) {
    if (!this.isFlashSaleGuardrailsEnabled()) {
      return;
    }

    const groups = await this.getDiscountedFlashSaleOrderItemGroups(
      tx,
      orderId,
      customerId,
      subOrderIds,
    );

    for (const group of groups) {
      const saleUpdated = await tx.flashSale.updateMany({
        where: {
          id: group.flashSaleId,
          reservedUnits: { gte: group.quantity },
        },
        data: {
          reservedUnits: { decrement: group.quantity },
        },
      });
      this.assertFlashSaleCounterUpdate(saleUpdated.count);

      const usageUpdated = await tx.flashSaleUserUsage.updateMany({
        where: {
          flashSaleId: group.flashSaleId,
          userId: customerId,
          reservedUnits: { gte: group.quantity },
        },
        data: {
          reservedUnits: { decrement: group.quantity },
        },
      });
      this.assertFlashSaleCounterUpdate(usageUpdated.count);
    }
  }

  private async createLedgerEntry(
    tx: Prisma.TransactionClient,
    data: Prisma.MarketplaceLedgerEntryCreateInput,
  ) {
    const existing = await tx.marketplaceLedgerEntry.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      select: { id: true },
    });
    if (existing) {
      return null;
    }

    return tx.marketplaceLedgerEntry.create({ data });
  }

  private async postOrderLedger(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.createLedgerEntry(tx, {
      type: MarketplaceLedgerEntryType.PAYMENT_CAPTURE,
      status: MarketplaceLedgerEntryStatus.POSTED,
      amount: order.totalAmount,
      currency: CURRENCY,
      idempotencyKey: `order:${order.id}:payment_capture`,
      order: { connect: { id: order.id } },
      customer: { connect: { id: order.customerId } },
    });

    for (const subOrder of order.subOrders) {
      const gross = this.calculateSubOrderGross(subOrder.items);
      const platformFee = this.calculatePlatformFee(gross);
      const sellerEarning = Math.max(0, gross - platformFee);
      const platformDiscount = this.calculateSubOrderPlatformDiscount(subOrder);

      await this.createLedgerEntry(tx, {
        type: MarketplaceLedgerEntryType.SELLER_EARNING,
        status: MarketplaceLedgerEntryStatus.POSTED,
        amount: sellerEarning,
        currency: CURRENCY,
        idempotencyKey: `sub_order:${subOrder.id}:seller_earning`,
        order: { connect: { id: order.id } },
        subOrder: { connect: { id: subOrder.id } },
        seller: { connect: { id: subOrder.sellerId } },
        customer: { connect: { id: order.customerId } },
      });

      await this.createLedgerEntry(tx, {
        type: MarketplaceLedgerEntryType.PLATFORM_FEE,
        status: MarketplaceLedgerEntryStatus.POSTED,
        amount: platformFee,
        currency: CURRENCY,
        idempotencyKey: `sub_order:${subOrder.id}:platform_fee`,
        order: { connect: { id: order.id } },
        subOrder: { connect: { id: subOrder.id } },
        seller: { connect: { id: subOrder.sellerId } },
        customer: { connect: { id: order.customerId } },
      });

      if (platformDiscount > 0) {
        await this.createLedgerEntry(tx, {
          type: MarketplaceLedgerEntryType.PLATFORM_DISCOUNT,
          status: MarketplaceLedgerEntryStatus.POSTED,
          amount: platformDiscount,
          currency: CURRENCY,
          idempotencyKey: `sub_order:${subOrder.id}:platform_discount`,
          order: { connect: { id: order.id } },
          subOrder: { connect: { id: subOrder.id } },
          seller: { connect: { id: subOrder.sellerId } },
          customer: { connect: { id: order.customerId } },
        });
      }
    }
  }

  async findAllSubOrdersByUser(userId: string): Promise<UnifiedOrder[]> {
    const [subOrders, customOrders] = await Promise.all([
      this.prisma.subOrder.findMany({
        where: { order: { customerId: userId } },
        include: this.userOrderInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customOrder.findMany({
        where: { customerId: userId },
        include: { seller: { select: this.sellerSelect } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return this.mergeAndSortOrders(
      this.formatStandardOrders(subOrders),
      this.formatCustomOrders(customOrders),
    );
  }

  async findAllSubOrdersBySeller(sellerId: string): Promise<UnifiedOrder[]> {
    const [subOrders, customOrders] = await Promise.all([
      this.prisma.subOrder.findMany({
        where: { sellerId },
        include: this.sellerOrderInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customOrder.findMany({
        where: { sellerId },
        include: { customer: { select: this.customerSelect } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return this.mergeAndSortOrders(
      this.formatStandardOrders(subOrders),
      this.formatCustomOrders(customOrders),
    );
  }

  private formatStandardOrders<T extends object>(orders: T[]): UnifiedOrder[] {
    return orders.map(
      (order) => ({ ...order, type: 'STANDARD' }) as unknown as UnifiedOrder,
    );
  }

  private formatCustomOrders(orders: CustomOrderSummary[]): UnifiedOrder[] {
    return orders.map(
      (co) =>
        ({
          id: co.id,
          orderId: co.id,
          sellerId: co.sellerId,
          seller: co.seller,
          subTotal: co.price,
          status: co.status,
          createdAt: co.createdAt,
          updatedAt: co.updatedAt,
          type: 'CUSTOM',
          items: [
            {
              id: co.id,
              productId: 'custom',
              quantity: 1,
              price: co.price,
              product: {
                name: co.title,
                images: co.sketchImageUrl
                  ? [{ url: co.sketchImageUrl, isMain: true }]
                  : [],
              },
            },
          ],
          order: {
            createdAt: co.createdAt,
            shippingAddress: null,
            paymentMethod: null,
            paymentStatus: co.paymentStatus ?? null,
            customer: co.customer,
          },
        }) as unknown as UnifiedOrder,
    );
  }

  private mergeAndSortOrders(
    standard: UnifiedOrder[],
    custom: UnifiedOrder[],
  ): UnifiedOrder[] {
    return [...standard, ...custom].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private readonly sellerSelect = {
    id: true,
    name: true,
    shopName: true,
    avatar: true,
  };
  private readonly customerSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
  };

  private readonly userOrderInclude = {
    seller: { select: this.sellerSelect },
    items: {
      include: {
        product: {
          include: { images: { where: { isMain: true as const }, take: 1 } },
        },
        review: true,
      },
    },
    order: {
      select: {
        createdAt: true,
        shippingAddress: true,
        giftWrap: true,
        giftCard: true,
        giftMessage: true,
        paymentMethod: true,
        paymentStatus: true,
      },
    },
  };

  private readonly sellerOrderInclude = {
    order: {
      select: {
        createdAt: true,
        shippingAddress: true,
        giftWrap: true,
        giftCard: true,
        giftMessage: true,
        paymentMethod: true,
        paymentStatus: true,
        customer: { select: this.customerSelect },
      },
    },
    items: { include: { product: { include: { images: true } } } },
  };

  private readonly orderDetailInclude = {
    customer: { select: this.customerSelect },
    subOrders: {
      include: {
        seller: { select: this.sellerSelect },
        items: { include: { product: { include: { images: true } } } },
      },
    },
    refunds: true,
  };

  private readonly subOrderDetailInclude = {
    order: {
      include: {
        customer: { select: this.customerSelect },
      },
    },
    seller: { select: this.sellerSelect },
    items: {
      include: { product: { include: { images: true } }, review: true },
    },
  };

  private isAdmin(roles: string[]) {
    return roles.includes('ROLE_ADMIN');
  }

  private normalizeQueryFilter(value?: string | null) {
    return value?.trim() || undefined;
  }

  private canAdvanceFromPending(order: Order) {
    if (order.paymentMethod === PaymentMethod.COD) {
      return true;
    }

    return order.paymentStatus === PaymentStatus.PAID;
  }

  private assertSubOrderStatusTransition(
    order: Order,
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ) {
    if (currentStatus === nextStatus) {
      return;
    }

    if (
      currentStatus === OrderStatus.CANCELLED ||
      currentStatus === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        `Cannot change status from ${currentStatus}`,
      );
    }

    if (nextStatus === OrderStatus.CANCELLED) {
      if (
        currentStatus !== OrderStatus.PENDING &&
        currentStatus !== OrderStatus.PAID
      ) {
        throw new BadRequestException(
          'Only pending or paid orders can be cancelled',
        );
      }
      return;
    }

    if (currentStatus === OrderStatus.PENDING) {
      if (
        nextStatus === OrderStatus.PROCESSING &&
        this.canAdvanceFromPending(order)
      ) {
        return;
      }

      throw new BadRequestException(
        'Pending orders can only move to processing after payment or use COD',
      );
    }

    if (
      currentStatus === OrderStatus.PAID &&
      nextStatus === OrderStatus.PROCESSING
    ) {
      return;
    }

    if (
      currentStatus === OrderStatus.PROCESSING &&
      nextStatus === OrderStatus.SHIPPED
    ) {
      return;
    }

    if (
      currentStatus === OrderStatus.SHIPPED &&
      nextStatus === OrderStatus.DELIVERED
    ) {
      return;
    }

    throw new BadRequestException(
      `Invalid status transition from ${currentStatus} to ${nextStatus}`,
    );
  }

  private canCustomerCancelOrder(subOrders: SubOrder[]) {
    const blockingStatuses: OrderStatus[] = [
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ];

    return (
      subOrders.some((subOrder) => subOrder.status !== OrderStatus.CANCELLED) &&
      subOrders.every((subOrder) => !blockingStatuses.includes(subOrder.status))
    );
  }

  private async restoreSubOrderStock(
    tx: Prisma.TransactionClient,
    items: Array<{ productId: string; quantity: number }>,
  ) {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          change: item.quantity,
          reason: InventoryChangeReason.RETURN,
        },
      });
    }
  }

  private async postOrderRefundLedger(
    tx: Prisma.TransactionClient,
    orderId: string,
    refundId: string,
    refundAmount: number,
    subOrderId?: string,
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const targetSubOrders = subOrderId
      ? order.subOrders.filter((subOrder) => subOrder.id === subOrderId)
      : order.subOrders;
    const targetPaidTotal = subOrderId
      ? targetSubOrders.reduce(
          (sum, subOrder) => sum + this.calculateSubOrderCustomerPaid(subOrder),
          0,
        )
      : Number(order.totalAmount);
    const ratio =
      targetPaidTotal > 0 ? Math.min(refundAmount / targetPaidTotal, 1) : 0;

    for (const subOrder of targetSubOrders) {
      const gross = this.calculateSubOrderGross(subOrder.items);
      const sellerNet = Math.max(0, gross - this.calculatePlatformFee(gross));
      const sellerRefundImpact = this.roundMoney(sellerNet * ratio);

      if (sellerRefundImpact === 0) {
        continue;
      }

      await this.createLedgerEntry(tx, {
        type: MarketplaceLedgerEntryType.REFUND,
        status: MarketplaceLedgerEntryStatus.POSTED,
        amount: -sellerRefundImpact,
        currency: CURRENCY,
        idempotencyKey: `refund:${refundId}:sub_order:${subOrder.id}`,
        order: { connect: { id: order.id } },
        subOrder: { connect: { id: subOrder.id } },
        refund: { connect: { id: refundId } },
        seller: { connect: { id: subOrder.sellerId } },
        customer: { connect: { id: order.customerId } },
      });
    }
  }

  private getOrderRefundPaymentStatus(
    orderTotal: number,
    refundedTotal: number,
  ) {
    return refundedTotal >= orderTotal
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;
  }

  private async cancelSubOrdersAndRestoreStock(
    tx: Prisma.TransactionClient,
    subOrders: Array<{
      id: string;
      items: Array<{ productId: string; quantity: number }>;
    }>,
    flashSaleRelease?: { orderId: string; customerId: string },
  ) {
    for (const subOrder of subOrders) {
      const updated = await tx.subOrder.updateMany({
        where: {
          id: subOrder.id,
          status: { not: OrderStatus.CANCELLED },
        },
        data: { status: OrderStatus.CANCELLED },
      });

      if (updated.count === 1) {
        await this.restoreSubOrderStock(tx, subOrder.items);
        if (flashSaleRelease) {
          await this.releaseFlashSaleReservations(
            tx,
            flashSaleRelease.orderId,
            flashSaleRelease.customerId,
            [subOrder.id],
          );
        }
      }
    }
  }

  private shouldReleaseFlashSaleReservationsForOrder(
    order: Pick<Order, 'paymentStatus'>,
  ) {
    return (
      order.paymentStatus !== PaymentStatus.PAID &&
      order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED &&
      order.paymentStatus !== PaymentStatus.REFUNDED
    );
  }

  private resolveCancelledPaymentStatus(order: Order) {
    if (order.paymentMethod === PaymentMethod.COD) {
      return PaymentStatus.FAILED;
    }

    if (
      order.paymentStatus === PaymentStatus.PAID ||
      order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
      order.paymentStatus === PaymentStatus.REFUNDED
    ) {
      return order.paymentStatus;
    }

    return PaymentStatus.FAILED;
  }

  async findAdminOrders(filters: AdminOrderFilters) {
    const normalizedCustomer = this.normalizeQueryFilter(filters.customer);
    const normalizedSeller = this.normalizeQueryFilter(filters.seller);

    const conditions: Prisma.OrderWhereInput[] = [];

    if (filters.status) {
      conditions.push({ status: filters.status });
    }

    if (filters.paymentMethod) {
      conditions.push({ paymentMethod: filters.paymentMethod });
    }

    if (filters.paymentStatus) {
      conditions.push({ paymentStatus: filters.paymentStatus });
    }

    if (normalizedCustomer) {
      conditions.push({
        OR: [
          { customerId: normalizedCustomer },
          {
            customer: {
              name: { contains: normalizedCustomer, mode: 'insensitive' },
            },
          },
          {
            customer: {
              email: { contains: normalizedCustomer, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (normalizedSeller) {
      conditions.push({
        subOrders: {
          some: {
            OR: [
              { sellerId: normalizedSeller },
              {
                seller: {
                  name: { contains: normalizedSeller, mode: 'insensitive' },
                },
              },
              {
                seller: {
                  shopName: {
                    contains: normalizedSeller,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          },
        },
      });
    }

    const orders = await this.prisma.order.findMany({
      where: conditions.length > 0 ? { AND: conditions } : undefined,
      include: this.orderDetailInclude,
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.attachFinancialSummary(order));
  }

  async findAdminOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderDetailInclude,
    });

    if (!order) throw new NotFoundException('Order not found');

    return this.attachFinancialSummary(order);
  }

  async getAdminOrderLedger(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        subOrders: { select: { id: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const subOrderIds = order.subOrders.map((subOrder) => subOrder.id);
    const where: Prisma.MarketplaceLedgerEntryWhereInput =
      subOrderIds.length > 0
        ? { OR: [{ orderId }, { subOrderId: { in: subOrderIds } }] }
        : { orderId };

    return this.prisma.marketplaceLedgerEntry.findMany({
      where,
      include: {
        seller: { select: this.sellerSelect },
        customer: { select: this.customerSelect },
        refund: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOrderById(userId: string, roles: string[], id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderDetailInclude,
    });

    if (!order) throw new NotFoundException('Order not found');
    if (!this.isAdmin(roles) && order.customerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    return this.attachFinancialSummary(order);
  }

  async findSubOrderById(userId: string, roles: string[], subOrderId: string) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: this.subOrderDetailInclude,
    });

    if (!subOrder) throw new NotFoundException('Order not found');

    if (
      !this.isAdmin(roles) &&
      subOrder.order.customerId !== userId &&
      subOrder.sellerId !== userId
    ) {
      throw new ForbiddenException('Not your order');
    }

    return subOrder;
  }

  async refundOrder(orderId: string, dto: CreateRefundDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: {
            items: true,
          },
        },
        refunds: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.paymentMethod !== PaymentMethod.STRIPE ||
      !order.paymentIntentId
    ) {
      throw new BadRequestException('Only paid Stripe orders can be refunded');
    }

    if (
      order.paymentStatus !== PaymentStatus.PAID &&
      order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException('Order is not refundable');
    }

    const targetSubOrder = dto.subOrderId
      ? order.subOrders.find((subOrder) => subOrder.id === dto.subOrderId)
      : null;

    if (dto.subOrderId && !targetSubOrder) {
      throw new BadRequestException('Sub-order does not belong to order');
    }

    const refundedAmount = this.calculateRefundedAmount(order.refunds);
    const refundableBalance = Number(order.totalAmount) - refundedAmount;
    const productPaidTotal = order.subOrders.reduce(
      (sum, subOrder) => sum + this.calculateSubOrderCustomerPaid(subOrder),
      0,
    );
    const directTargetRefundedAmount = dto.subOrderId
      ? order.refunds
          .filter(
            (refund) =>
              refund.status === RefundStatus.SUCCEEDED &&
              refund.subOrderId === dto.subOrderId,
          )
          .reduce((sum, refund) => sum + Number(refund.amount), 0)
      : refundedAmount;
    const allocatedOrderWideRefundAmount =
      targetSubOrder && productPaidTotal > 0
        ? order.refunds
            .filter(
              (refund) =>
                refund.status === RefundStatus.SUCCEEDED && !refund.subOrderId,
            )
            .reduce(
              (sum, refund) =>
                sum +
                Number(refund.amount) *
                  (this.calculateSubOrderCustomerPaid(targetSubOrder) /
                    productPaidTotal),
              0,
            )
        : 0;
    const targetRefundedAmount = targetSubOrder
      ? directTargetRefundedAmount + allocatedOrderWideRefundAmount
      : directTargetRefundedAmount;
    const targetRefundableBalance = targetSubOrder
      ? this.calculateSubOrderCustomerPaid(targetSubOrder) -
        targetRefundedAmount
      : refundableBalance;
    const amount = this.roundMoney(dto.amount ?? targetRefundableBalance);

    if (
      amount <= 0 ||
      amount > refundableBalance ||
      amount > targetRefundableBalance
    ) {
      throw new BadRequestException('Refund amount exceeds paid balance');
    }

    const idempotencyKey = [
      'refund',
      'order',
      order.id,
      dto.subOrderId ?? 'all',
      amount,
      dto.reason.trim(),
    ].join(':');

    const existingRefund = await this.prisma.refund.findUnique({
      where: { idempotencyKey },
    });
    if (existingRefund) {
      return existingRefund;
    }

    const stripeRefund = await this.stripeService.createRefund(
      order.paymentIntentId,
      amount,
      {
        orderId: order.id,
        subOrderId: dto.subOrderId ?? '',
        reason: dto.reason,
      },
      idempotencyKey,
    );

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          orderId: order.id,
          subOrderId: dto.subOrderId ?? null,
          paymentIntentId: order.paymentIntentId!,
          providerRefundId: stripeRefund.id,
          amount,
          currency: CURRENCY,
          reason: dto.reason,
          status: RefundStatus.SUCCEEDED,
          idempotencyKey,
        },
      });

      await this.postOrderRefundLedger(
        tx,
        order.id,
        refund.id,
        amount,
        dto.subOrderId,
      );

      const nextPaymentStatus = this.getOrderRefundPaymentStatus(
        Number(order.totalAmount),
        refundedAmount + amount,
      );

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: nextPaymentStatus,
        },
      });

      if (nextPaymentStatus === PaymentStatus.REFUNDED) {
        await this.rewardsService.refundRedeemedPointsForOrder(
          tx,
          order.id,
          'Order was fully refunded',
        );
      }

      return refund;
    });
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    if (!this.canCustomerCancelOrder(order.subOrders)) {
      throw new BadRequestException('This order can no longer be cancelled');
    }

    const shouldRefund =
      order.paymentMethod === PaymentMethod.STRIPE &&
      (order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED);

    const refund = shouldRefund
      ? await this.refundOrder(orderId, { reason: 'Customer cancellation' })
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
      await this.cancelSubOrdersAndRestoreStock(
        tx,
        order.subOrders,
        !refund && this.shouldReleaseFlashSaleReservationsForOrder(order)
          ? { orderId, customerId: order.customerId }
          : undefined,
      );

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: refund
            ? PaymentStatus.REFUNDED
            : this.resolveCancelledPaymentStatus(order),
        },
        include: this.orderDetailInclude,
      });

      await this.rewardsService.refundRedeemedPointsForOrder(
        tx,
        orderId,
        'Order was cancelled',
      );

      return {
        ...this.attachFinancialSummary(updatedOrder),
        refund,
        refundRequired: false,
      };
    });

    await this.notifyOrderCancelledByCustomer({
      id: order.id,
      customerId: order.customerId,
      subOrders: order.subOrders.map((subOrder) => ({
        id: subOrder.id,
        sellerId: subOrder.sellerId,
      })),
    });

    return result;
  }

  async updateSubOrderStatus(
    actorId: string,
    roles: string[],
    subOrderId: string,
    status: OrderStatus,
  ) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: {
        order: true,
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    });

    if (!subOrder) throw new NotFoundException('SubOrder not found');
    if (!this.isAdmin(roles) && subOrder.sellerId !== actorId)
      throw new ForbiddenException('Not your order');

    this.assertSubOrderStatusTransition(
      subOrder.order,
      subOrder.status,
      status,
    );

    if (
      status === OrderStatus.CANCELLED &&
      subOrder.status !== OrderStatus.CANCELLED &&
      subOrder.order.paymentMethod === PaymentMethod.STRIPE &&
      (subOrder.order.paymentStatus === PaymentStatus.PAID ||
        subOrder.order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED)
    ) {
      await this.refundOrder(subOrder.orderId, {
        subOrderId,
        reason: 'Sub-order cancellation',
      });
    }

    const updatedSubOrder = await this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.CANCELLED) {
        const cancelled = await tx.subOrder.updateMany({
          where: {
            id: subOrderId,
            status: { not: OrderStatus.CANCELLED },
          },
          data: { status },
        });

        if (cancelled.count === 1) {
          await this.restoreSubOrderStock(tx, subOrder.items);
          if (this.shouldReleaseFlashSaleReservationsForOrder(subOrder.order)) {
            await this.releaseFlashSaleReservations(
              tx,
              subOrder.orderId,
              subOrder.order.customerId,
              [subOrderId],
            );
          }
        }

        await this.syncMasterOrderStatus(tx, subOrder.orderId);
        return tx.subOrder.update({
          where: { id: subOrderId },
          data: { status },
        });
      }

      const updated = await tx.subOrder.update({
        where: { id: subOrderId },
        data: { status },
      });

      await this.syncMasterOrderStatus(tx, subOrder.orderId);
      return updated;
    });

    await this.notifySubOrderStatusChanged({
      orderId: subOrder.orderId,
      subOrderId: subOrder.id,
      sellerId: subOrder.sellerId,
      customerId: subOrder.order.customerId,
      status,
      notifySeller: this.isAdmin(roles) && subOrder.sellerId !== actorId,
    });

    return updatedSubOrder;
  }

  async updateAdminOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatableSubOrders = order.subOrders.filter(
      (subOrder) => subOrder.status !== OrderStatus.CANCELLED,
    );

    if (updatableSubOrders.length === 0) {
      throw new BadRequestException('Order has no active sub-orders');
    }

    for (const subOrder of updatableSubOrders) {
      this.assertSubOrderStatusTransition(order, subOrder.status, status);
    }

    if (
      status === OrderStatus.CANCELLED &&
      order.paymentMethod === PaymentMethod.STRIPE &&
      (order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED)
    ) {
      await this.refundOrder(orderId, { reason: 'Admin cancellation' });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.CANCELLED) {
        await this.cancelSubOrdersAndRestoreStock(
          tx,
          updatableSubOrders,
          this.shouldReleaseFlashSaleReservationsForOrder(order)
            ? { orderId, customerId: order.customerId }
            : undefined,
        );
      } else {
        await tx.subOrder.updateMany({
          where: {
            orderId,
            status: { not: OrderStatus.CANCELLED },
          },
          data: { status },
        });
      }

      await this.syncMasterOrderStatus(tx, orderId);

      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: this.orderDetailInclude,
      });

      return updatedOrder ? this.attachFinancialSummary(updatedOrder) : null;
    });

    await Promise.all(
      updatableSubOrders.map((subOrder) =>
        this.notifySubOrderStatusChanged({
          orderId,
          subOrderId: subOrder.id,
          sellerId: subOrder.sellerId,
          customerId: order.customerId,
          status,
          notifySeller: true,
        }),
      ),
    );

    return result;
  }

  async confirmPayment(userId: string, paymentIntentId: string) {
    const order = await this.prisma.order.findUnique({
      where: { paymentIntentId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentMethod !== PaymentMethod.STRIPE) {
      throw new BadRequestException(
        'Only Stripe orders can be confirmed with payment intent',
      );
    }
    if (order.customerId !== userId)
      throw new ForbiddenException('Not your order');

    if (order.paymentStatus === PaymentStatus.PAID) {
      return {
        success: true,
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
      };
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order has been cancelled');
    }

    const paymentIntent =
      await this.stripeService.retrievePaymentIntent(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment has not succeeded yet');
    }

    this.assertStripePaymentMatchesOrder(order, {
      id: paymentIntent.id,
      amount: paymentIntent.amount_received || paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await this.markStripeOrderPaid(tx, order.id);

      return {
        success: true,
        orderId: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
      };
    });
  }

  private assertStripePaymentMatchesOrder(
    order: Order,
    payment: PaymentIntentSnapshot,
  ) {
    if (payment.id !== order.paymentIntentId) {
      throw new BadRequestException('Payment intent does not belong to order');
    }

    const expectedAmount = Math.round(Number(order.totalAmount));
    if (payment.amount !== expectedAmount) {
      throw new BadRequestException('Payment amount does not match order');
    }

    if (payment.currency.toLowerCase() !== 'vnd') {
      throw new BadRequestException('Payment currency does not match order');
    }

    const metadata = payment.metadata ?? {};
    if (metadata.orderId && metadata.orderId !== order.id) {
      throw new BadRequestException('Payment metadata does not match order');
    }

    if (metadata.userId && metadata.userId !== order.customerId) {
      throw new BadRequestException('Payment metadata does not match customer');
    }
  }

  private async markStripeOrderPaid(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    if (!this.isFlashSaleGuardrailsEnabled()) {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
          paymentExpiresAt: null,
        },
      });

      await tx.subOrder.updateMany({
        where: {
          orderId,
          status: { not: OrderStatus.CANCELLED },
        },
        data: { status: OrderStatus.PAID },
      });

      await this.postOrderLedger(tx, orderId);

      return updatedOrder;
    }

    const transitioned = await tx.order.updateMany({
      where: {
        id: orderId,
        paymentStatus: PaymentStatus.UNPAID,
        status: { not: OrderStatus.CANCELLED },
      },
      data: {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paymentExpiresAt: null,
      },
    });

    const updatedOrder = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    if (transitioned.count !== 1) {
      return updatedOrder;
    }

    await this.convertFlashSaleReservationsToSold(
      tx,
      updatedOrder.id,
      updatedOrder.customerId,
    );

    await tx.subOrder.updateMany({
      where: {
        orderId,
        status: { not: OrderStatus.CANCELLED },
      },
      data: { status: OrderStatus.PAID },
    });

    await this.postOrderLedger(tx, orderId);

    return updatedOrder;
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private isCheckoutIdempotencyConflict(error: unknown) {
    if (!this.isUniqueConstraintError(error)) {
      return false;
    }

    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return (
        target.includes('customerId') &&
        target.includes('checkoutIdempotencyKey')
      );
    }

    if (typeof target === 'string') {
      return (
        target.includes('customerId') &&
        target.includes('checkoutIdempotencyKey')
      );
    }

    return false;
  }

  private async recordWebhookEvent(
    tx: Prisma.TransactionClient,
    payload: StripeWebhookPaymentPayload,
  ) {
    try {
      await tx.paymentWebhookEvent.create({
        data: {
          eventId: payload.eventId,
          type: payload.type,
          paymentIntentId: payload.paymentIntentId,
        },
      });
      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return false;
      }
      throw error;
    }
  }

  async handlePaymentIntentSucceeded(payload: StripeWebhookPaymentPayload) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { paymentIntentId: payload.paymentIntentId },
      });

      if (!order) {
        return { received: true, processed: false, reason: 'order_not_found' };
      }

      const recorded = await this.recordWebhookEvent(tx, payload);
      if (!recorded) {
        return { received: true, processed: false, reason: 'duplicate' };
      }

      if (order.paymentMethod !== PaymentMethod.STRIPE) {
        return {
          received: true,
          processed: false,
          reason: 'not_stripe_order',
        };
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        return { received: true, processed: false, reason: 'already_paid' };
      }

      if (order.status === OrderStatus.CANCELLED) {
        return {
          received: true,
          processed: false,
          reason: 'order_cancelled',
        };
      }

      if (payload.amount === undefined || payload.currency === undefined) {
        throw new BadRequestException('Payment payload is incomplete');
      }

      this.assertStripePaymentMatchesOrder(order, {
        id: payload.paymentIntentId,
        amount: payload.amount,
        currency: payload.currency,
        metadata: payload.metadata,
      });

      const updatedOrder = await this.markStripeOrderPaid(tx, order.id);

      return {
        received: true,
        processed: true,
        orderId: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
      };
    });
  }

  async handlePaymentIntentFailed(payload: StripeWebhookPaymentPayload) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { paymentIntentId: payload.paymentIntentId },
        include: {
          subOrders: {
            include: {
              items: {
                select: {
                  productId: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return { received: true, processed: false, reason: 'order_not_found' };
      }

      const recorded = await this.recordWebhookEvent(tx, payload);
      if (!recorded) {
        return { received: true, processed: false, reason: 'duplicate' };
      }

      if (
        order.paymentMethod !== PaymentMethod.STRIPE ||
        order.paymentStatus !== PaymentStatus.UNPAID ||
        order.status === OrderStatus.CANCELLED
      ) {
        return { received: true, processed: false, reason: 'terminal_order' };
      }

      const updatedOrder = await this.cancelStripeOrderAndRestoreStock(
        tx,
        order,
      );

      return {
        received: true,
        processed: true,
        orderId: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
      };
    });
  }

  private async cancelStripeOrderAndRestoreStock(
    tx: Prisma.TransactionClient,
    order: OrderWithStockItems,
  ) {
    await this.cancelSubOrdersAndRestoreStock(tx, order.subOrders, {
      orderId: order.id,
      customerId: order.customerId,
    });

    await this.rewardsService.refundRedeemedPointsForOrder(
      tx,
      order.id,
      'Stripe payment was not completed',
    );

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
        paymentExpiresAt: null,
        checkoutIdempotencyKey: null,
      },
    });
  }

  async releaseExpiredStripeOrders() {
    const now = new Date();
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.UNPAID,
        status: OrderStatus.PENDING,
        paymentExpiresAt: { lt: now },
      },
      include: {
        subOrders: {
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        },
      },
      take: 50,
    });

    let released = 0;

    for (const order of expiredOrders) {
      if (order.paymentIntentId) {
        await this.stripeService.cancelPaymentIntent(order.paymentIntentId);
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const freshOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: {
            subOrders: {
              include: {
                items: {
                  select: {
                    productId: true,
                    quantity: true,
                  },
                },
              },
            },
          },
        });

        if (
          !freshOrder ||
          freshOrder.paymentStatus !== PaymentStatus.UNPAID ||
          freshOrder.status !== OrderStatus.PENDING ||
          !freshOrder.paymentExpiresAt ||
          freshOrder.paymentExpiresAt > now
        ) {
          return null;
        }

        return this.cancelStripeOrderAndRestoreStock(tx, freshOrder);
      });

      if (updated) {
        released += 1;
      }
    }

    return { released };
  }

  private async syncMasterOrderStatus(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const [order, subOrders] = await Promise.all([
      tx.order.findUnique({
        where: { id: orderId },
      }),
      tx.subOrder.findMany({
        where: { orderId },
      }),
    ]);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const activeSubOrders = subOrders.filter(
      (subOrder) => subOrder.status !== OrderStatus.CANCELLED,
    );

    const statusHierarchy: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 1,
      [OrderStatus.PAID]: 2,
      [OrderStatus.PROCESSING]: 3,
      [OrderStatus.SHIPPED]: 4,
      [OrderStatus.DELIVERED]: 5,
      [OrderStatus.CANCELLED]: 0,
    };

    let newMasterStatus: OrderStatus;

    if (activeSubOrders.length === 0) {
      newMasterStatus = OrderStatus.CANCELLED;
    } else {
      const minStatusWeight = Math.min(
        ...activeSubOrders.map(
          (subOrder) => statusHierarchy[subOrder.status] ?? 1,
        ),
      );

      const statusKey = Object.entries(statusHierarchy).find(
        ([key, value]) =>
          key !== OrderStatus.CANCELLED && value === minStatusWeight,
      )?.[0];

      newMasterStatus = (statusKey as OrderStatus) || OrderStatus.PENDING;

      if (
        activeSubOrders.every(
          (subOrder) => subOrder.status === OrderStatus.DELIVERED,
        )
      ) {
        newMasterStatus = OrderStatus.DELIVERED;
      }
    }

    let newPaymentStatus = order.paymentStatus;

    if (newMasterStatus === OrderStatus.CANCELLED) {
      newPaymentStatus = this.resolveCancelledPaymentStatus(order);
    } else if (order.paymentMethod === PaymentMethod.COD) {
      newPaymentStatus = activeSubOrders.every(
        (subOrder) => subOrder.status === OrderStatus.DELIVERED,
      )
        ? PaymentStatus.PAID
        : PaymentStatus.COD_PENDING;
    } else if (
      order.paymentMethod === PaymentMethod.STRIPE &&
      order.paymentStatus === PaymentStatus.UNPAID
    ) {
      newPaymentStatus = PaymentStatus.UNPAID;
    }

    const shouldConvertCodReservation =
      this.isFlashSaleGuardrailsEnabled() &&
      order.paymentMethod === PaymentMethod.COD &&
      order.paymentStatus !== PaymentStatus.PAID &&
      newPaymentStatus === PaymentStatus.PAID;

    if (shouldConvertCodReservation) {
      const transitioned = await tx.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: { not: PaymentStatus.PAID },
        },
        data: {
          status: newMasterStatus,
          paymentStatus: newPaymentStatus,
        },
      });

      if (transitioned.count === 1) {
        await this.convertFlashSaleReservationsToSold(
          tx,
          orderId,
          order.customerId,
        );
        await this.postOrderLedger(tx, orderId);
        if (
          newMasterStatus === OrderStatus.DELIVERED &&
          newPaymentStatus === PaymentStatus.PAID
        ) {
          await this.rewardsService.awardOrderCompletionPoints(tx, orderId);
        }
      }

      return;
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: newMasterStatus,
        paymentStatus: newPaymentStatus,
      },
    });

    if (
      order.paymentMethod === PaymentMethod.COD &&
      newPaymentStatus === PaymentStatus.PAID
    ) {
      await this.postOrderLedger(tx, orderId);
    }

    if (newMasterStatus === OrderStatus.CANCELLED) {
      await this.rewardsService.refundRedeemedPointsForOrder(
        tx,
        orderId,
        'Order was cancelled',
      );
    }

    if (
      newMasterStatus === OrderStatus.DELIVERED &&
      newPaymentStatus === PaymentStatus.PAID
    ) {
      await this.rewardsService.awardOrderCompletionPoints(tx, orderId);
    }
  }
}
