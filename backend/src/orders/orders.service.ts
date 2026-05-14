import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'crypto';
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
} from '@prisma/client';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateRefundDto } from './dto/create-refund.dto';

const SHIPPING_FEE = 25000;
const CURRENCY = 'vnd';
const DEFAULT_PLATFORM_COMMISSION_BPS = 1000;
const STRIPE_PAYMENT_EXPIRY_MS = 30 * 60 * 1000;
const EXPIRED_ORDER_SWEEP_MS = 5 * 60 * 1000;
const CART_PRICING_CHANGED_MESSAGE =
  'Cart pricing changed. Please refresh your cart.';

interface SubOrderGroup {
  subTotal: number;
  items: EnrichedCartItem[];
}

interface ExecuteCheckoutTransactionParams {
  userId: string;
  cart: EnrichedCart;
  sellerGroups: Map<string, SubOrderGroup>;
  shippingAddress: Record<string, unknown>;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string | null;
  paymentExpiresAt?: Date | null;
  idempotencyKey?: string | null;
}

interface CheckoutFingerprintContext {
  userId: string;
  paymentMethod: PaymentMethod;
  cart: EnrichedCart;
  shippingAddress: Record<string, unknown>;
}

interface CheckoutReuseValidationContext {
  expectedFingerprint?: string;
  shippingAddressHash?: string;
  currentCartItems?: CheckoutCartComparisonItem[];
}

interface CheckoutCartComparisonItem {
  productId: string;
  quantity: number;
}

interface CheckoutFlashSalePricingSnapshot {
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  flashSaleId: string | null;
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
    const configured = Number(process.env.PLATFORM_COMMISSION_BPS);
    if (!Number.isFinite(configured) || configured < 0) {
      return DEFAULT_PLATFORM_COMMISSION_BPS;
    }

    return Math.min(Math.floor(configured), 10000);
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
          },
        );
        if (reusableCheckout) {
          return reusableCheckout;
        }
      }
    }

    const cart = await this.cartService.getCart(userId);
    this.validateCart(cart);

    const sellerGroups = this.groupItemsBySeller(cart.items);
    const checkoutFingerprint = this.buildCheckoutFingerprint({
      userId,
      paymentMethod: normalizedPaymentMethod,
      cart,
      shippingAddress,
    });
    const idempotencyKey =
      providedIdempotencyKey ??
      this.buildServerCheckoutIdempotencyKey(checkoutFingerprint);
    const reuseValidation: CheckoutReuseValidationContext = {
      expectedFingerprint: checkoutFingerprint,
      shippingAddressHash: this.hashCheckoutValue(shippingAddress),
      currentCartItems:
        currentCartItemsForProvidedKey ?? this.getCartComparisonItems(cart.items),
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
          cart,
          sellerGroups,
          shippingAddress,
          paymentMethod: PaymentMethod.COD,
          paymentStatus: PaymentStatus.COD_PENDING,
          idempotencyKey,
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

      return {
        orderId: order.id,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: order.paymentStatus,
        expiresAt: null,
        requiresPayment: false,
      };
    }

    const finalTotal = cart.total + SHIPPING_FEE;

    const paymentIntent = await this.stripeService.createPaymentIntent(
      finalTotal,
      'vnd',
      { userId, voucherCode: cart.appliedVoucher?.code || '' },
    );

    let order: Order;
    try {
      order = await this.executeCheckoutTransaction({
        userId,
        cart,
        sellerGroups,
        shippingAddress,
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.UNPAID,
        paymentIntentId: paymentIntent.id,
        paymentExpiresAt: new Date(Date.now() + STRIPE_PAYMENT_EXPIRY_MS),
        idempotencyKey,
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
      voucherCode: cart.appliedVoucher?.code || '',
    });

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
      shippingAddressHash: this.hashCheckoutValue(context.shippingAddress),
      items: this.getCheckoutFingerprintItems(context.cart.items),
    });
  }

  private buildExistingOrderFingerprint(order: OrderWithCheckoutSnapshot) {
    return this.hashCheckoutValue({
      userId: order.customerId,
      paymentMethod: order.paymentMethod,
      voucherCode: order.voucherCode ?? null,
      orderTotal: this.toCheckoutMoney(order.totalAmount),
      discountAmount: this.toCheckoutMoney(order.discountAmount),
      shippingAddressHash: this.hashCheckoutValue(order.shippingAddress ?? null),
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
      }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
  }

  private getCartComparisonItems(items: EnrichedCartItem[]) {
    return items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  }

  private getOrderComparisonItems(order: OrderWithCheckoutSnapshot) {
    return order.subOrders.flatMap((subOrder) =>
      subOrder.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
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
        .map((item) => `${item.productId}:${item.quantity}`)
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
    } = params;

    return this.prisma.$transaction(async (tx) => {
      const flashSaleSnapshots = this.isFlashSaleGuardrailsEnabled()
        ? await this.revalidateFlashSalePricing(tx, cart)
        : undefined;

      await this.updateStock(tx, cart.items);

      const order = await tx.order.create({
        data: {
          customerId: userId,
          totalAmount: cart.total + SHIPPING_FEE,
          discountAmount: cart.discountAmount,
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
      };
    }

    const matchedRange = flashSale.ranges.find(
      (range) =>
        originalPrice >= Number(range.minPrice) &&
        originalPrice <= Number(range.maxPrice),
    );

    if (!matchedRange) {
      return {
        originalPrice,
        discountedPrice: originalPrice,
        discountPercent: 0,
        flashSaleId: flashSale.id,
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
  ) {
    for (const item of items) {
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
          deletedAt: null,
          status: ProductStatus.APPROVED,
          stock: { gte: item.quantity },
          category: {
            deletedAt: null,
            status: CategoryStatus.ACTIVE,
          },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (result.count !== 1) {
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

    for (let i = 0; i < groups.length; i++) {
      const [sellerId, data] = groups[i];
      const isLast = i === groups.length - 1;

      const subOrderDiscount = isLast
        ? remainingDiscount
        : Math.round(
            cart.discountAmount * (data.subTotal / (cart.subtotal || 1)),
          );

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

  private async createLedgerEntry(
    tx: Prisma.TransactionClient,
    data: Prisma.MarketplaceLedgerEntryCreateInput,
  ) {
    try {
      return await tx.marketplaceLedgerEntry.create({ data });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return null;
      }
      throw error;
    }
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
      }
    }
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

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: this.getOrderRefundPaymentStatus(
            Number(order.totalAmount),
            refundedAmount + amount,
          ),
        },
      });

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

    return this.prisma.$transaction(async (tx) => {
      await this.cancelSubOrdersAndRestoreStock(tx, order.subOrders);

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

      return {
        ...this.attachFinancialSummary(updatedOrder),
        refund,
        refundRequired: false,
      };
    });
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

    return this.prisma.$transaction(async (tx) => {
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

    return this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.CANCELLED) {
        await this.cancelSubOrdersAndRestoreStock(tx, updatableSubOrders);
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
    await this.cancelSubOrdersAndRestoreStock(tx, order.subOrders);

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
  }
}
