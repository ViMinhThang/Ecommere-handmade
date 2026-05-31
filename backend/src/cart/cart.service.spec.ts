import { BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';

describe('CartService voucher range matching', () => {
  let service: CartService;

  beforeEach(() => {
    service = new CartService({} as never, {} as never, {} as never);
  });

  const buildRange = (overrides: Record<string, unknown> = {}) => ({
    id: 'range-1',
    voucherId: 'voucher-1',
    minPrice: 100,
    maxPrice: 1000,
    discountPercent: 10,
    endDate: new Date('2030-01-01T00:00:00.000Z'),
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  it('matches voucher ranges inclusively at maxPrice boundary', () => {
    const match = service['findMatchingVoucherRange']([buildRange()], 1000);

    expect(match?.id).toBe('range-1');
  });

  it('treats null maxPrice as no upper bound defensively', () => {
    const match = service['findMatchingVoucherRange'](
      [buildRange({ maxPrice: null })],
      5000,
    );

    expect(match?.id).toBe('range-1');
  });

  it('matches shop vouchers only against items from the same seller', () => {
    const item = {
      product: {
        categoryId: 'cat_1',
        sellerId: 'seller_1',
      },
    };

    expect(
      service['isVoucherItemEligible'](item as never, {
        categoryId: 'cat_1',
        sellerId: 'seller_1',
      }),
    ).toBe(true);
    expect(
      service['isVoucherItemEligible'](item as never, {
        categoryId: 'cat_1',
        sellerId: 'seller_2',
      }),
    ).toBe(false);
    expect(
      service['isVoucherItemEligible'](item as never, {
        categoryId: 'cat_1',
        sellerId: null,
      }),
    ).toBe(true);
  });
});

describe('CartService personalization', () => {
  const buildProduct = (overrides: Record<string, unknown> = {}) => ({
    id: 'product_1',
    personalizationEnabled: false,
    personalizationRequired: false,
    personalizationMaxLength: 120,
    ...overrides,
  });

  const buildCart = (overrides: Record<string, unknown> = {}) => ({
    id: 'cart_1',
    userId: 'customer_1',
    appliedVoucher: null,
    items: [],
    ...overrides,
  });

  const buildCartItem = (overrides: Record<string, unknown> = {}) => ({
    id: 'cart_item_1',
    cartId: 'cart_1',
    productId: 'product_1',
    quantity: 1,
    personalization: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    product: {
      id: 'product_1',
      price: 100000,
      categoryId: 'cat_1',
      images: [],
      category: { id: 'cat_1', name: 'Trang sức' },
      seller: {
        id: 'seller_1',
        name: 'Seller',
        shopName: 'Shop',
        avatar: null,
      },
    },
    ...overrides,
  });

  const createService = () => {
    const prisma = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const vouchers = {
      assertVoucherUsageAvailable: jest.fn(),
      calculateDiscountAmount: jest.fn(),
      findByCode: jest.fn(),
    };
    const flashSales = {
      calculateEffectivePrice: jest.fn(() => ({
        originalPrice: 100000,
        discountedPrice: 100000,
        discountPercent: 0,
        flashSaleId: null,
      })),
    };

    return {
      service: new CartService(
        prisma as never,
        vouchers as never,
        flashSales as never,
      ),
      prisma,
      flashSales,
    };
  };

  it('adds a product without personalization as before', async () => {
    const { service, prisma } = createService();
    prisma.cart.findUnique.mockResolvedValue(buildCart());
    prisma.product.findFirst.mockResolvedValue(buildProduct());
    prisma.cartItem.findUnique.mockResolvedValue(null);
    prisma.cartItem.create.mockResolvedValue(buildCartItem());

    await service.addToCart('customer_1', {
      productId: 'product_1',
      quantity: 1,
    });

    expect(prisma.cartItem.create).toHaveBeenCalledWith({
      data: {
        cartId: 'cart_1',
        productId: 'product_1',
        quantity: 1,
      },
    });
  });

  it('rejects personalization text when product personalization is disabled', async () => {
    const { service, prisma } = createService();
    prisma.cart.findUnique.mockResolvedValue(buildCart());
    prisma.product.findFirst.mockResolvedValue(buildProduct());

    await expect(
      service.addToCart('customer_1', {
        productId: 'product_1',
        quantity: 1,
        personalization: { text: 'Khắc tên Linh' },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows optional personalization to be omitted for enabled products', async () => {
    const { service, prisma } = createService();
    prisma.cart.findUnique.mockResolvedValue(buildCart());
    prisma.product.findFirst.mockResolvedValue(
      buildProduct({ personalizationEnabled: true }),
    );
    prisma.cartItem.findUnique.mockResolvedValue(null);
    prisma.cartItem.create.mockResolvedValue(buildCartItem());

    await service.addToCart('customer_1', {
      productId: 'product_1',
      quantity: 1,
    });

    expect(prisma.cartItem.create.mock.calls[0][0].data).not.toHaveProperty(
      'personalization',
    );
  });

  it('rejects missing text for required personalization products', async () => {
    const { service, prisma } = createService();
    prisma.cart.findUnique.mockResolvedValue(buildCart());
    prisma.product.findFirst.mockResolvedValue(
      buildProduct({
        personalizationEnabled: true,
        personalizationRequired: true,
      }),
    );

    await expect(
      service.addToCart('customer_1', {
        productId: 'product_1',
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects text longer than product personalizationMaxLength', async () => {
    const { service, prisma } = createService();
    prisma.cart.findUnique.mockResolvedValue(buildCart());
    prisma.product.findFirst.mockResolvedValue(
      buildProduct({
        personalizationEnabled: true,
        personalizationMaxLength: 5,
      }),
    );

    await expect(
      service.addToCart('customer_1', {
        productId: 'product_1',
        quantity: 1,
        personalization: { text: 'Tên quá dài' },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('trims personalization text before storing it', async () => {
    const { service, prisma } = createService();
    prisma.cart.findUnique.mockResolvedValue(buildCart());
    prisma.product.findFirst.mockResolvedValue(
      buildProduct({ personalizationEnabled: true }),
    );
    prisma.cartItem.findUnique.mockResolvedValue(null);
    prisma.cartItem.create.mockResolvedValue(buildCartItem());

    await service.addToCart('customer_1', {
      productId: 'product_1',
      quantity: 1,
      personalization: { text: '  Khắc tên Linh  ' },
    });

    expect(prisma.cartItem.create).toHaveBeenCalledWith({
      data: {
        cartId: 'cart_1',
        productId: 'product_1',
        quantity: 1,
        personalization: { text: 'Khắc tên Linh' },
      },
    });
  });

  it('rejects quantity updates for required personalization items without text', async () => {
    const { service, prisma } = createService();
    prisma.cart.findUnique.mockResolvedValue(buildCart());
    prisma.cartItem.findUnique.mockResolvedValue(buildCartItem());
    prisma.product.findFirst.mockResolvedValue(
      buildProduct({
        personalizationEnabled: true,
        personalizationRequired: true,
      }),
    );

    await expect(
      service.updateItemQuantity('customer_1', 'product_1', {
        quantity: 2,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns personalization in cart responses', async () => {
    const { service, prisma, flashSales } = createService();
    prisma.cart.findUnique.mockResolvedValue(
      buildCart({
        items: [
          buildCartItem({
            personalization: { text: 'Khắc tên Linh' },
          }),
        ],
      }),
    );

    const cart = await service.getCart('customer_1');

    expect(cart.items[0].personalization).toEqual({ text: 'Khắc tên Linh' });
    expect(flashSales.calculateEffectivePrice).toHaveBeenCalledWith(
      100000,
      'cat_1',
      'product_1',
    );
  });
});
