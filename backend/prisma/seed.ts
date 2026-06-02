import {
  CategoryStatus,
  ChatMessageType,
  CommissionPostStatus,
  CommissionProposalStatus,
  CustomOrderStatus,
  FlashSaleState,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductQuestionStatus,
  ProductStatus,
  ReportStatus,
  ReportType,
  Role,
  ShipmentTrackingEventType,
  UserStatus,
} from '@prisma/client';
import { readFileSync } from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'admin123';
const DEMO_PASSWORD_HASH =
  '$2b$12$X8rFEi2HOdDt90rYjdzVa.NX5PhzFf.zXS.rtoTC2X4TTqV4ld.HK';

const demoImages = {
  ceramic:
    'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=80',
  linen:
    'https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=80',
  candle:
    'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80',
  jewelry:
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
  wood: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80',
  paper:
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=900&q=80',
  crochet:
    'https://images.unsplash.com/photo-1606103920295-9a091573f160?auto=format&fit=crop&w=900&q=80',
  decor:
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
  soap: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=900&q=80',
  hair: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=900&q=80',
  leather:
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80',
  gift: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=80',
};

const demoImageSourceNote =
  'Ảnh demo dùng URL Unsplash cho local MVP; không hotlink ảnh từ sàn thương mại điện tử, không watermark, không tạo ảnh AI.';

type DemoUserInput = {
  email: string;
  name: string;
  roles: Role[];
  phone?: string;
  shopName?: string;
  sellerTitle?: string;
  sellerBio?: string;
  sellerAbout?: string;
  sellerHeroImage?: string;
  sellerAboutImage?: string;
  sellerStat1Label?: string;
  sellerStat1Value?: string;
  sellerStat2Label?: string;
  sellerStat2Value?: string;
  artisanVerified?: boolean;
  craftSpecialty?: string;
  craftExperienceYears?: number;
  craftMaterials?: string[];
  verificationNote?: string;
  avatar?: string;
};

type DemoProductInput = {
  sku: string;
  name: string;
  description: string;
  price: string;
  categoryId: string;
  sellerId: string;
  stock: number;
  lowStockThreshold: number;
  tags: string[];
  image: string;
  status?: ProductStatus;
  createdAt?: Date;
  viewCount?: number;
  optionColors?: string[];
  optionMaterials?: string[];
  optionSizes?: string[];
  processingTime?: string;
  shippingProfileId?: string | null;
};

type RealHandmadeFixture = {
  meta?: {
    name?: string;
    generatedFrom?: string;
    imageStrategy?: string;
  };
  sellers?: Array<{
    email: string;
    name: string;
    shopName: string;
    sellerTitle?: string;
    sellerBio?: string;
    sellerAbout?: string;
    avatar?: string | null;
    sellerHeroImage?: string | null;
    sellerAboutImage?: string | null;
  }>;
  products?: Array<{
    sku: string;
    name: string;
    description: string;
    priceVnd: number;
    categorySlug: string;
    sellerEmail: string;
    status?: string;
    stock?: number;
    lowStockThreshold?: number;
    imageUrl: string;
    tags?: string[];
  }>;
};

const realFixturePath = path.join(
  process.cwd(),
  'prisma',
  'fixtures',
  'handmade-real-products.json',
);

async function upsertDemoUser(input: DemoUserInput) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      password: DEMO_PASSWORD_HASH,
      roles: input.roles,
      phone: input.phone,
      shopName: input.shopName,
      sellerTitle: input.sellerTitle,
      sellerBio: input.sellerBio,
      sellerAbout: input.sellerAbout,
      sellerHeroImage: input.sellerHeroImage,
      sellerAboutImage: input.sellerAboutImage,
      sellerStat1Label: input.sellerStat1Label,
      sellerStat1Value: input.sellerStat1Value,
      sellerStat2Label: input.sellerStat2Label,
      sellerStat2Value: input.sellerStat2Value,
      artisanVerified: input.artisanVerified ?? false,
      craftSpecialty: input.craftSpecialty,
      craftExperienceYears: input.craftExperienceYears,
      craftMaterials: input.craftMaterials ?? [],
      verificationNote: input.verificationNote,
      avatar: input.avatar,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      deletedAt: null,
    },
    create: {
      email: input.email,
      name: input.name,
      password: DEMO_PASSWORD_HASH,
      roles: input.roles,
      phone: input.phone,
      shopName: input.shopName,
      sellerTitle: input.sellerTitle,
      sellerBio: input.sellerBio,
      sellerAbout: input.sellerAbout,
      sellerHeroImage: input.sellerHeroImage,
      sellerAboutImage: input.sellerAboutImage,
      sellerStat1Label: input.sellerStat1Label,
      sellerStat1Value: input.sellerStat1Value,
      sellerStat2Label: input.sellerStat2Label,
      sellerStat2Value: input.sellerStat2Value,
      artisanVerified: input.artisanVerified ?? false,
      craftSpecialty: input.craftSpecialty,
      craftExperienceYears: input.craftExperienceYears,
      craftMaterials: input.craftMaterials ?? [],
      verificationNote: input.verificationNote,
      avatar: input.avatar,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });
}

async function ensureDefaultAddress(userId: string) {
  const existing = await prisma.address.findFirst({
    where: { userId, isDefault: true },
  });

  const address = {
    fullName: 'Nguyễn Minh Anh',
    phone: '0900000001',
    address: '12 Đường Thủ Công',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Bến Nghé',
    isDefault: true,
    deletedAt: null,
  };

  if (existing) {
    return prisma.address.update({
      where: { id: existing.id },
      data: address,
    });
  }

  return prisma.address.create({
    data: { ...address, userId },
  });
}

async function upsertProduct(input: DemoProductInput) {
  const existing = await prisma.product.findFirst({
    where: { sku: input.sku },
  });

  const data = {
    name: input.name,
    description: input.description,
    price: input.price,
    categoryId: input.categoryId,
    sellerId: input.sellerId,
    status: input.status ?? ProductStatus.APPROVED,
    stock: input.stock,
    lowStockThreshold: input.lowStockThreshold,
    sku: input.sku,
    tags: input.tags,
    optionColors: input.optionColors ?? [],
    optionMaterials: input.optionMaterials ?? [],
    optionSizes: input.optionSizes ?? [],
    processingTime: input.processingTime ?? null,
    shippingProfileId: input.shippingProfileId ?? null,
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    ...(input.viewCount !== undefined ? { viewCount: input.viewCount } : {}),
    deletedAt: null,
  };

  const product = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.product.create({
        data,
      });

  const mainImage = await prisma.productImage.findFirst({
    where: { productId: product.id, isMain: true },
  });

  if (mainImage) {
    await prisma.productImage.update({
      where: { id: mainImage.id },
      data: { url: input.image, deletedAt: null },
    });
  } else {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: input.image,
        isMain: true,
      },
    });
  }

  return product;
}

type SeededProduct = Awaited<ReturnType<typeof upsertProduct>>;

async function upsertProducts(inputs: DemoProductInput[]) {
  const products: Record<string, SeededProduct> = {};

  for (const input of inputs) {
    products[input.sku] = await upsertProduct(input);
  }

  return products;
}

async function ensureShippingProfile(input: {
  sellerId: string;
  name: string;
  carrierName: string;
  trackingUrlTemplate?: string | null;
  processingMinDays: number;
  processingMaxDays: number;
  transitMinDays: number;
  transitMaxDays: number;
  isDefault?: boolean;
  isActive?: boolean;
}) {
  const existing = await prisma.shippingProfile.findFirst({
    where: {
      sellerId: input.sellerId,
      name: input.name,
      deletedAt: null,
    },
  });

  const data = {
    carrierName: input.carrierName,
    trackingUrlTemplate: input.trackingUrlTemplate ?? null,
    processingMinDays: input.processingMinDays,
    processingMaxDays: input.processingMaxDays,
    transitMinDays: input.transitMinDays,
    transitMaxDays: input.transitMaxDays,
    isDefault: input.isDefault ?? false,
    isActive: input.isActive ?? true,
    deletedAt: null,
  };

  if (data.isDefault) {
    await prisma.shippingProfile.updateMany({
      where: { sellerId: input.sellerId, deletedAt: null },
      data: { isDefault: false },
    });
  }

  return existing
    ? prisma.shippingProfile.update({
        where: { id: existing.id },
        data,
      })
    : prisma.shippingProfile.create({
        data: {
          sellerId: input.sellerId,
          name: input.name,
          ...data,
        },
      });
}

function loadRealHandmadeFixture(): RealHandmadeFixture | null {
  try {
    return JSON.parse(
      readFileSync(realFixturePath, 'utf8'),
    ) as RealHandmadeFixture;
  } catch (error) {
    console.warn(
      `Skip real handmade fixture: cannot read ${realFixturePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

function parseFixtureProductStatus(status?: string) {
  switch ((status || '').toUpperCase()) {
    case ProductStatus.PENDING:
      return ProductStatus.PENDING;
    case ProductStatus.REJECTED:
      return ProductStatus.REJECTED;
    case ProductStatus.APPROVED:
    default:
      return ProductStatus.APPROVED;
  }
}

function isHttpsUrl(value?: string | null) {
  return typeof value === 'string' && /^https:\/\//i.test(value);
}

async function seedRealHandmadeFixture(
  categoryIds: Record<string, string>,
): Promise<{ productCount: number; sellerCount: number }> {
  const fixture = loadRealHandmadeFixture();
  const sellers = fixture?.sellers ?? [];
  const products = fixture?.products ?? [];

  if (sellers.length === 0 || products.length === 0) {
    return { productCount: 0, sellerCount: 0 };
  }

  const sellerIds: Record<string, string> = {};
  for (const seller of sellers) {
    const seededSeller = await upsertDemoUser({
      email: seller.email,
      name: seller.name,
      roles: [Role.ROLE_USER, Role.ROLE_SELLER],
      shopName: seller.shopName,
      sellerTitle: seller.sellerTitle,
      sellerBio: seller.sellerBio,
      sellerAbout: seller.sellerAbout,
      sellerHeroImage: isHttpsUrl(seller.sellerHeroImage)
        ? (seller.sellerHeroImage ?? undefined)
        : undefined,
      sellerAboutImage: isHttpsUrl(seller.sellerAboutImage)
        ? (seller.sellerAboutImage ?? undefined)
        : undefined,
      avatar: isHttpsUrl(seller.avatar)
        ? (seller.avatar ?? undefined)
        : undefined,
    });
    sellerIds[seller.email] = seededSeller.id;
  }

  await Promise.all(
    Object.entries(sellerIds).map(([sellerEmail, sellerId]) =>
      ensureMediaLibrary(
        sellerId,
        products
          .filter((product) => product.sellerEmail === sellerEmail)
          .map((product) => product.imageUrl)
          .filter(isHttpsUrl),
      ),
    ),
  );

  let productCount = 0;
  for (const product of products) {
    const categoryId =
      categoryIds[product.categorySlug] ?? categoryIds['wall-decor'];
    const sellerId =
      sellerIds[product.sellerEmail] ?? sellerIds[sellers[0]?.email ?? ''];

    if (!categoryId || !sellerId || !isHttpsUrl(product.imageUrl)) continue;

    await upsertProduct({
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: String(
        Math.max(0, Math.round((Number(product.priceVnd) || 0) / 1000) * 1000),
      ),
      categoryId,
      sellerId,
      stock: Math.max(0, Number(product.stock ?? 5)),
      lowStockThreshold: Math.max(1, Number(product.lowStockThreshold ?? 3)),
      tags: product.tags ?? ['real-data', 'ebay', 'handmade'],
      image: product.imageUrl,
      status: parseFixtureProductStatus(product.status),
      createdAt:
        product.categorySlug === 'hair-accessories'
          ? new Date('2024-01-01T00:00:00.000Z')
          : undefined,
      viewCount: product.categorySlug === 'hair-accessories' ? 0 : undefined,
    });
    productCount += 1;
  }

  return { productCount, sellerCount: Object.keys(sellerIds).length };
}

async function ensureVoucher(input: {
  code: string;
  name: string;
  description: string;
  categoryId: string;
  isActive: boolean;
  endDate: Date;
  discountPercent: string;
}) {
  const voucher = await prisma.voucher.upsert({
    where: { code: input.code },
    update: {
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      isActive: input.isActive,
      endDate: input.endDate,
      deletedAt: null,
    },
    create: {
      name: input.name,
      description: input.description,
      code: input.code,
      categoryId: input.categoryId,
      isActive: input.isActive,
      endDate: input.endDate,
    },
  });

  const range = await prisma.voucherRange.findFirst({
    where: { voucherId: voucher.id },
  });

  const rangeData = {
    minPrice: '0',
    maxPrice: '999999999',
    discountPercent: input.discountPercent,
    endDate: input.endDate,
    deletedAt: null,
  };

  if (range) {
    await prisma.voucherRange.update({
      where: { id: range.id },
      data: rangeData,
    });
  } else {
    await prisma.voucherRange.create({
      data: {
        voucherId: voucher.id,
        ...rangeData,
      },
    });
  }

  return voucher;
}

function addSeedDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function buildSeedShippingEstimate(input: {
  sellerId: string;
  productId: string;
  createdAt?: Date;
}) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { shippingProfile: true },
  });
  const sellerDefault = await prisma.shippingProfile.findFirst({
    where: {
      sellerId: input.sellerId,
      isDefault: true,
      isActive: true,
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });
  const source =
    product?.shippingProfile &&
    product.shippingProfile.isActive &&
    !product.shippingProfile.deletedAt
      ? product.shippingProfile
      : sellerDefault;
  const profile = source
    ? {
        id: source.id,
        name: source.name,
        carrierName: source.carrierName,
        trackingUrlTemplate: source.trackingUrlTemplate ?? null,
        processingMinDays: Math.max(0, source.processingMinDays),
        processingMaxDays: Math.max(source.processingMinDays, source.processingMaxDays),
        transitMinDays: Math.max(0, source.transitMinDays),
        transitMaxDays: Math.max(source.transitMinDays, source.transitMaxDays),
      }
    : {
        id: null,
        name: 'Giao hàng tiêu chuẩn',
        carrierName: 'Đơn vị vận chuyển tiêu chuẩn',
        trackingUrlTemplate: null,
        processingMinDays: 1,
        processingMaxDays: 3,
        transitMinDays: 2,
        transitMaxDays: 5,
      };
  const baseDate = input.createdAt ?? new Date();

  return {
    shippingProfileId: profile.id,
    shippingProfileSnapshot: {
      version: 1,
      profileId: profile.id,
      name: profile.name,
      carrierName: profile.carrierName,
      trackingUrlTemplate: profile.trackingUrlTemplate,
      processingMinDays: profile.processingMinDays,
      processingMaxDays: profile.processingMaxDays,
      transitMinDays: profile.transitMinDays,
      transitMaxDays: profile.transitMaxDays,
      itemProfiles: [
        {
          productId: input.productId,
          productName: product?.name ?? '',
          profileId: profile.id,
          name: profile.name,
          carrierName: profile.carrierName,
          processingMinDays: profile.processingMinDays,
          processingMaxDays: profile.processingMaxDays,
          transitMinDays: profile.transitMinDays,
          transitMaxDays: profile.transitMaxDays,
        },
      ],
    },
    estimatedShipStartAt: addSeedDays(baseDate, profile.processingMinDays),
    estimatedShipEndAt: addSeedDays(baseDate, profile.processingMaxDays),
    estimatedDeliveryStartAt: addSeedDays(
      baseDate,
      profile.processingMinDays + profile.transitMinDays,
    ),
    estimatedDeliveryEndAt: addSeedDays(
      baseDate,
      profile.processingMaxDays + profile.transitMaxDays,
    ),
  };
}

async function ensureDemoOrder(input: {
  checkoutIdempotencyKey: string;
  customerId: string;
  sellerId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  orderStatus: OrderStatus;
  subOrderStatus: OrderStatus;
  paymentStatus?: PaymentStatus;
  createdAt?: Date;
}) {
  const include = {
    subOrders: {
      include: {
        items: true,
      },
    },
  };

  const subtotal = Number(input.unitPrice) * input.quantity;
  const shippingFee = 25000;
  const shippingEstimate = await buildSeedShippingEstimate({
    sellerId: input.sellerId,
    productId: input.productId,
    createdAt: input.createdAt,
  });
  const paymentStatus =
    input.paymentStatus ??
    (input.orderStatus === OrderStatus.DELIVERED
      ? PaymentStatus.PAID
      : input.orderStatus === OrderStatus.CANCELLED
        ? PaymentStatus.UNPAID
        : PaymentStatus.COD_PENDING);

  const existing = await prisma.order.findFirst({
    where: {
      customerId: input.customerId,
      checkoutIdempotencyKey: input.checkoutIdempotencyKey,
    },
    include,
  });

  if (existing) {
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        totalAmount: String(subtotal + shippingFee),
        status: input.orderStatus,
        paymentMethod: PaymentMethod.COD,
        paymentStatus,
        currency: 'vnd',
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        shippingAddress: {
          fullName: 'Nguyễn Minh Anh',
          phone: '0900000001',
          address: '12 Đường Thủ Công, Quận 1, Hồ Chí Minh',
        },
      },
    });

    const existingSubOrder = existing.subOrders[0];
    if (existingSubOrder) {
      await prisma.subOrder.update({
        where: { id: existingSubOrder.id },
        data: {
          sellerId: input.sellerId,
          subTotal: String(subtotal),
          status: input.subOrderStatus,
          discountAmount: '0',
          shippingProfileId: shippingEstimate.shippingProfileId,
          shippingProfileSnapshot:
            shippingEstimate.shippingProfileSnapshot as Prisma.InputJsonValue,
          estimatedShipStartAt: shippingEstimate.estimatedShipStartAt,
          estimatedShipEndAt: shippingEstimate.estimatedShipEndAt,
          estimatedDeliveryStartAt: shippingEstimate.estimatedDeliveryStartAt,
          estimatedDeliveryEndAt: shippingEstimate.estimatedDeliveryEndAt,
          ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        },
      });

      const existingItem = existingSubOrder.items[0];
      if (existingItem) {
        await prisma.orderItem.update({
          where: { id: existingItem.id },
          data: {
            productId: input.productId,
            quantity: input.quantity,
            price: input.unitPrice,
            originalPrice: input.unitPrice,
            platformDiscountAmount: '0',
          },
        });
      } else {
        await prisma.orderItem.create({
          data: {
            subOrderId: existingSubOrder.id,
            productId: input.productId,
            quantity: input.quantity,
            price: input.unitPrice,
            originalPrice: input.unitPrice,
          },
        });
      }
    } else {
      await prisma.subOrder.create({
        data: {
          orderId: existing.id,
          sellerId: input.sellerId,
          subTotal: String(subtotal),
          status: input.subOrderStatus,
          shippingProfileId: shippingEstimate.shippingProfileId,
          shippingProfileSnapshot:
            shippingEstimate.shippingProfileSnapshot as Prisma.InputJsonValue,
          estimatedShipStartAt: shippingEstimate.estimatedShipStartAt,
          estimatedShipEndAt: shippingEstimate.estimatedShipEndAt,
          estimatedDeliveryStartAt: shippingEstimate.estimatedDeliveryStartAt,
          estimatedDeliveryEndAt: shippingEstimate.estimatedDeliveryEndAt,
          ...(input.createdAt ? { createdAt: input.createdAt } : {}),
          items: {
            create: [
              {
                productId: input.productId,
                quantity: input.quantity,
                price: input.unitPrice,
                originalPrice: input.unitPrice,
              },
            ],
          },
        },
      });
    }

    return prisma.order.findUniqueOrThrow({
      where: { id: existing.id },
      include,
    });
  }

  return prisma.order.create({
    data: {
      customerId: input.customerId,
      totalAmount: String(subtotal + shippingFee),
      status: input.orderStatus,
      paymentMethod: PaymentMethod.COD,
      paymentStatus,
      checkoutIdempotencyKey: input.checkoutIdempotencyKey,
      currency: 'vnd',
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      shippingAddress: {
        fullName: 'Nguyễn Minh Anh',
        phone: '0900000001',
        address: '12 Đường Thủ Công, Quận 1, Hồ Chí Minh',
      },
      subOrders: {
        create: [
          {
            sellerId: input.sellerId,
            subTotal: String(subtotal),
            status: input.subOrderStatus,
            shippingProfileId: shippingEstimate.shippingProfileId,
            shippingProfileSnapshot:
              shippingEstimate.shippingProfileSnapshot as Prisma.InputJsonValue,
            estimatedShipStartAt: shippingEstimate.estimatedShipStartAt,
            estimatedShipEndAt: shippingEstimate.estimatedShipEndAt,
            estimatedDeliveryStartAt: shippingEstimate.estimatedDeliveryStartAt,
            estimatedDeliveryEndAt: shippingEstimate.estimatedDeliveryEndAt,
            ...(input.createdAt ? { createdAt: input.createdAt } : {}),
            items: {
              create: [
                {
                  productId: input.productId,
                  quantity: input.quantity,
                  price: input.unitPrice,
                  originalPrice: input.unitPrice,
                },
              ],
            },
          },
        ],
      },
    },
    include,
  });
}

async function ensureShipmentTrackingEvent(input: {
  subOrderId?: string;
  createdById?: string;
  status?: OrderStatus;
  type: ShipmentTrackingEventType;
  title: string;
  description?: string;
  location?: string;
  carrier?: string;
  trackingCode?: string;
  occurredAt?: Date;
}) {
  if (!input.subOrderId) {
    return null;
  }

  const existing = await prisma.shipmentTrackingEvent.findFirst({
    where: {
      subOrderId: input.subOrderId,
      title: input.title,
      trackingCode: input.trackingCode ?? null,
    },
  });

  const data = {
    createdById: input.createdById,
    status: input.status,
    type: input.type,
    description: input.description,
    location: input.location,
    carrier: input.carrier,
    trackingCode: input.trackingCode,
    occurredAt: input.occurredAt ?? new Date(),
  };

  if (existing) {
    return prisma.shipmentTrackingEvent.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.shipmentTrackingEvent.create({
    data: {
      subOrderId: input.subOrderId,
      title: input.title,
      ...data,
    },
  });
}

async function seedCeramicPurchaseHistoryForUsers(categoryId: string) {
  const staleHistoryOrders = await prisma.order.findMany({
    where: {
      checkoutIdempotencyKey: { startsWith: 'seed-ceramic-history-' },
      customer: {
        OR: [
          { roles: { has: Role.ROLE_SELLER } },
          { roles: { has: Role.ROLE_ADMIN } },
        ],
      },
    },
    include: {
      subOrders: {
        include: {
          items: {
            select: { id: true },
          },
        },
      },
    },
  });
  const staleOrderIds = staleHistoryOrders.map((order) => order.id);
  const staleOrderItemIds = staleHistoryOrders.flatMap((order) =>
    order.subOrders.flatMap((subOrder) =>
      subOrder.items.map((item) => item.id),
    ),
  );

  if (staleOrderItemIds.length > 0) {
    await prisma.review.deleteMany({
      where: { orderItemId: { in: staleOrderItemIds } },
    });
  }
  if (staleOrderIds.length > 0) {
    await prisma.order.deleteMany({
      where: { id: { in: staleOrderIds } },
    });
  }

  const [users, ceramicProducts] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        deletedAt: null,
        roles: { has: Role.ROLE_USER },
        NOT: [{ roles: { has: Role.ROLE_SELLER } }, { roles: { has: Role.ROLE_ADMIN } }],
      },
      orderBy: { email: 'asc' },
      take: 20,
      select: { id: true, email: true },
    }),
    prisma.product.findMany({
      where: {
        categoryId,
        status: ProductStatus.APPROVED,
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      take: 40,
      select: { id: true, price: true, sellerId: true },
    }),
  ]);

  if (users.length === 0 || ceramicProducts.length === 0) return 0;

  const desiredHistoryKeys = users.flatMap((user, userIndex) => {
    const ordersForUser = userIndex < 11 ? 3 : 2;
    return Array.from(
      { length: ordersForUser },
      (_, orderIndex) =>
        `seed-ceramic-history-${user.email}-${orderIndex + 1}`,
    );
  });
  const extraHistoryOrders = await prisma.order.findMany({
    where: {
      checkoutIdempotencyKey: { startsWith: 'seed-ceramic-history-' },
      customer: {
        roles: { has: Role.ROLE_USER },
        NOT: [
          { roles: { has: Role.ROLE_SELLER } },
          { roles: { has: Role.ROLE_ADMIN } },
        ],
      },
      NOT: {
        checkoutIdempotencyKey: { in: desiredHistoryKeys },
      },
    },
    include: {
      subOrders: {
        include: {
          items: {
            select: { id: true },
          },
        },
      },
    },
  });
  const extraOrderIds = extraHistoryOrders.map((order) => order.id);
  const extraOrderItemIds = extraHistoryOrders.flatMap((order) =>
    order.subOrders.flatMap((subOrder) =>
      subOrder.items.map((item) => item.id),
    ),
  );

  if (extraOrderItemIds.length > 0) {
    await prisma.review.deleteMany({
      where: { orderItemId: { in: extraOrderItemIds } },
    });
  }
  if (extraOrderIds.length > 0) {
    await prisma.order.deleteMany({
      where: { id: { in: extraOrderIds } },
    });
  }

  const now = new Date();
  let ordersCount = 0;

  for (let userIndex = 0; userIndex < users.length; userIndex += 1) {
    const user = users[userIndex];
    const ordersForUser = userIndex < 11 ? 3 : 2;

    for (let orderIndex = 0; orderIndex < ordersForUser; orderIndex += 1) {
      const productOffset = userIndex * 3 + orderIndex;
      const product =
        ceramicProducts.find(
          (_, index) =>
            index >= productOffset % ceramicProducts.length &&
            ceramicProducts[index].sellerId !== user.id,
        ) ??
        ceramicProducts.find((item) => item.sellerId !== user.id) ??
        ceramicProducts[productOffset % ceramicProducts.length];
      const createdAt = new Date(
        now.getTime() -
          (userIndex * 3 + orderIndex + 2) * 24 * 60 * 60 * 1000,
      );
      const quantity = (userIndex + orderIndex) % 3 === 0 ? 2 : 1;

      await ensureDemoOrder({
        checkoutIdempotencyKey: `seed-ceramic-history-${user.email}-${orderIndex + 1}`,
        customerId: user.id,
        sellerId: product.sellerId,
        productId: product.id,
        quantity,
        unitPrice: String(Math.round(Number(product.price))),
        orderStatus: OrderStatus.DELIVERED,
        subOrderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        createdAt,
      });
      ordersCount += 1;
    }
  }

  return ordersCount;
}

async function seedReviewsForCeramicPurchaseHistory() {
  const reviewComments = [
    'Men gốm lên màu rất đẹp, cầm chắc tay và dùng gói kẹ.',
    'Sản phẩm đúng ảnh, bề mặt hoàn thiện mịn và dùng hằng ngày rất thích.',
    'Màu men ngoài đời ấm hơn ảnh, shop gói hàng cẩn thận.',
    'Đường nét thủ công có nét riêng, đặt trên bàn rất xinh.',
    'Giao hàng nhanh, món gốm không sứt mẻ và chất lượng tốt.',
    'Kiểu dáng tối giản, phù hợp làm quà tặng cho người thích đồ thủ công.',
    'Lớp men đẹp, hơi khác nhẹ giữa từng sản phẩm nhưng rất có duyên.',
    'Sản phẩm chắc chắn, giá hợp lý so với độ hoàn thiện.',
  ];
  const sellerReplies = [
    'Cảm ơn bạn đã ủng hộ shop, chúc bạn dùng sản phẩm thật vui.',
    'Shop rất vui khi sản phẩm đến tay bạn an toàn.',
    'Cảm ơn góp ý của bạn, shop sẽ tiếp tục hoàn thiện từng mẻ gốm.',
    'Cảm ơn bạn đã yêu thích đồ gốm thủ công của shop.',
  ];
  const orders = await prisma.order.findMany({
    where: {
      checkoutIdempotencyKey: { startsWith: 'seed-ceramic-history-' },
      status: OrderStatus.DELIVERED,
      customer: {
        roles: { has: Role.ROLE_USER },
        NOT: [
          { roles: { has: Role.ROLE_SELLER } },
          { roles: { has: Role.ROLE_ADMIN } },
        ],
      },
    },
    include: {
      subOrders: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let reviewsCount = 0;
  for (let orderIndex = 0; orderIndex < orders.length; orderIndex += 1) {
    const order = orders[orderIndex];
    const orderItems = order.subOrders.flatMap((subOrder) => subOrder.items);

    for (let itemIndex = 0; itemIndex < orderItems.length; itemIndex += 1) {
      const orderItem = orderItems[itemIndex];
      const commentIndex =
        (orderIndex + itemIndex) % reviewComments.length;
      const rating = [5, 5, 4, 5, 4][(orderIndex + itemIndex) % 5];

      await ensureReviewForOrderItem({
        orderItemId: orderItem.id,
        userId: order.customerId,
        productId: orderItem.productId,
        rating,
        comment: reviewComments[commentIndex],
        sellerReply:
          orderIndex % 3 === 0
            ? sellerReplies[orderIndex % sellerReplies.length]
            : undefined,
      });
      reviewsCount += 1;
    }
  }

  return reviewsCount;
}

async function ensureMediaLibrary(userId: string, imagePaths: string[]) {
  const folderName = 'Ảnh demo sản phẩm';
  const folder =
    (await prisma.imageFolder.findFirst({
      where: { userId, name: folderName, deletedAt: null },
    })) ??
    (await prisma.imageFolder.create({
      data: {
        userId,
        name: folderName,
      },
    }));

  for (const imagePath of imagePaths) {
    const existing = await prisma.image.findFirst({
      where: { folderId: folder.id, path: imagePath },
    });
    const displayName = getDemoImageDisplayName(imagePath);

    if (existing) {
      await prisma.image.update({
        where: { id: existing.id },
        data: { displayName, deletedAt: null },
      });
    } else {
      await prisma.image.create({
        data: {
          folderId: folder.id,
          path: imagePath,
          displayName,
        },
      });
    }
  }
}

function getDemoImageDisplayName(imagePath: string) {
  if (/^https?:\/\//i.test(imagePath)) {
    const url = new URL(imagePath);
    const photoId = url.pathname.split('/').filter(Boolean).pop();
    return photoId || 'demo-image-url';
  }

  return imagePath.split(/[\\/]/).pop() || imagePath;
}

async function ensureDemoCart(
  userId: string,
  items: Array<{ productId: string; quantity: number }>,
) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    update: { deletedAt: null, appliedVoucherId: null },
    create: { userId },
  });

  for (const item of items) {
    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: item.productId,
        },
      },
      update: { quantity: item.quantity },
      create: {
        cartId: cart.id,
        productId: item.productId,
        quantity: item.quantity,
      },
    });
  }
}

async function ensureReviewForOrderItem(input: {
  orderItemId: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  sellerReply?: string;
}) {
  return prisma.review.upsert({
    where: { orderItemId: input.orderItemId },
    update: {
      rating: input.rating,
      comment: input.comment,
      sellerReply: input.sellerReply,
    },
    create: {
      rating: input.rating,
      comment: input.comment,
      sellerReply: input.sellerReply,
      userId: input.userId,
      productId: input.productId,
      orderItemId: input.orderItemId,
    },
  });
}

async function ensureProductQuestion(input: {
  productId: string;
  userId: string;
  answeredById: string;
  question: string;
  answer: string;
}) {
  const existing = await prisma.productQuestion.findFirst({
    where: { productId: input.productId, userId: input.userId },
  });
  const data = {
    question: input.question,
    answer: input.answer,
    answeredAt: new Date(),
    answeredById: input.answeredById,
    status: ProductQuestionStatus.PUBLISHED,
  };

  if (existing) {
    return prisma.productQuestion.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.productQuestion.create({
    data: {
      productId: input.productId,
      userId: input.userId,
      ...data,
    },
  });
}

async function ensureReport(input: {
  reporterId: string;
  type: ReportType;
  reason: string;
  description: string;
  status?: ReportStatus;
  targetUserId?: string;
  targetProductId?: string;
  orderId?: string;
  resolvedById?: string;
  adminNote?: string;
}) {
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: input.reporterId,
      type: input.type,
      targetUserId: input.targetUserId,
      targetProductId: input.targetProductId,
      orderId: input.orderId,
    },
  });
  const status = input.status ?? ReportStatus.PENDING;
  const data = {
    type: input.type,
    reason: input.reason,
    description: input.description,
    status,
    targetUserId: input.targetUserId,
    targetProductId: input.targetProductId,
    orderId: input.orderId,
    resolvedById: input.resolvedById,
    adminNote: input.adminNote,
    resolvedAt:
      status === ReportStatus.RESOLVED || status === ReportStatus.REJECTED
        ? new Date()
        : null,
  };

  if (existing) {
    return prisma.report.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.report.create({
    data: {
      reporterId: input.reporterId,
      ...data,
    },
  });
}

async function ensureNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Prisma.InputJsonValue;
  dedupeKey: string;
  readAt?: Date | null;
}) {
  return prisma.notification.upsert({
    where: {
      userId_dedupeKey: {
        userId: input.userId,
        dedupeKey: input.dedupeKey,
      },
    },
    update: {
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      metadata: input.metadata ?? undefined,
      readAt: input.readAt ?? null,
      deletedAt: null,
    },
    create: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      metadata: input.metadata ?? undefined,
      dedupeKey: input.dedupeKey,
      readAt: input.readAt ?? null,
    },
  });
}

async function ensureChatConversation(input: {
  customerId: string;
  sellerId: string;
  productId?: string;
  messages: Array<{ senderId: string; text: string }>;
}) {
  const conversation = await prisma.chatConversation.upsert({
    where: {
      customerId_sellerId: {
        customerId: input.customerId,
        sellerId: input.sellerId,
      },
    },
    update: {
      contextProductId: input.productId,
      updatedAt: new Date(),
    },
    create: {
      customerId: input.customerId,
      sellerId: input.sellerId,
      contextProductId: input.productId,
      readStates: {
        create: [{ userId: input.customerId }, { userId: input.sellerId }],
      },
    },
  });

  const messageCount = await prisma.chatMessage.count({
    where: { conversationId: conversation.id },
  });
  if (messageCount === 0) {
    for (const message of input.messages) {
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: message.senderId,
          type: ChatMessageType.TEXT,
          payload: { text: message.text },
        },
      });
    }
  }
}

async function ensureQuoteTemplate(input: {
  sellerId: string;
  name: string;
  title: string;
  description: string;
  estimatedPrice: string;
  minPrice: string;
  maxPrice: string;
  estimatedLeadTime: string;
}) {
  const existing = await prisma.customOrderQuoteTemplate.findFirst({
    where: { sellerId: input.sellerId, name: input.name, deletedAt: null },
  });
  const data = {
    sellerId: input.sellerId,
    name: input.name,
    title: input.title,
    description: input.description,
    estimatedPrice: input.estimatedPrice,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    materials: ['Gốm thủ công', 'Men an toàn thực phẩm'],
    sizeOptions: ['Bộ 2 món', 'Bộ 4 món'],
    estimatedLeadTime: input.estimatedLeadTime,
    revisionPolicy: 'Bao gồm 1 lần chỉnh sửa bản phác thảo.',
    shippingNote: 'Đóng gói chống sốc trước khi giao.',
    termsNote: 'Khách duyệt phác thảo trước khi người bán bắt đầu chế tác.',
    isActive: true,
    deletedAt: null,
  };

  if (existing) {
    return prisma.customOrderQuoteTemplate.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.customOrderQuoteTemplate.create({ data });
}

async function ensureCustomOrder(input: {
  customerId: string;
  sellerId: string;
  quoteTemplateId?: string;
  title: string;
  artisanNote: string;
  price: string;
  leadTime: string;
  sketchImageUrl: string;
  status: CustomOrderStatus;
}) {
  const existing = await prisma.customOrder.findFirst({
    where: {
      customerId: input.customerId,
      sellerId: input.sellerId,
      title: input.title,
    },
  });
  const data = {
    sellerId: input.sellerId,
    quoteTemplateId: input.quoteTemplateId,
    quoteSnapshot: input.quoteTemplateId
      ? {
          title: input.title,
          price: input.price,
          leadTime: input.leadTime,
        }
      : undefined,
    quoteSentAt: new Date(),
    quoteAcceptedAt: new Date(),
    title: input.title,
    artisanNote: input.artisanNote,
    price: input.price,
    leadTime: input.leadTime,
    specifications: ['Màu ấm', 'Cá nhân hóa theo tên', 'Đóng gói quà tặng'],
    sketchImageUrl: input.sketchImageUrl,
    status: input.status,
    paymentStatus:
      input.status === CustomOrderStatus.AWAITING_PAYMENT
        ? PaymentStatus.UNPAID
        : PaymentStatus.PAID,
    deliveredAt:
      input.status === CustomOrderStatus.DELIVERED ? new Date() : null,
    cancelledAt:
      input.status === CustomOrderStatus.CANCELLED ? new Date() : null,
  };

  if (existing) {
    return prisma.customOrder.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.customOrder.create({
    data: {
      customerId: input.customerId,
      ...data,
    },
  });
}

async function ensureCustomOrderProgressEvent(input: {
  customOrderId: string;
  actorId: string;
  status: CustomOrderStatus;
  title: string;
  note?: string;
  imageUrl?: string;
  createdAt?: Date;
}) {
  const existing = await prisma.customOrderProgressEvent.findFirst({
    where: {
      customOrderId: input.customOrderId,
      title: input.title,
    },
  });
  const data = {
    actorId: input.actorId,
    status: input.status,
    title: input.title,
    note: input.note ?? null,
    imageUrl: input.imageUrl ?? null,
    createdAt: input.createdAt ?? new Date(),
  };

  if (existing) {
    return prisma.customOrderProgressEvent.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.customOrderProgressEvent.create({
    data: {
      customOrderId: input.customOrderId,
      ...data,
    },
  });
}

async function ensureCommissionDemo(input: {
  customerId: string;
  sellerId: string;
  title: string;
  referenceImage: string;
}) {
  const existingPost = await prisma.commissionPost.findFirst({
    where: { customerId: input.customerId, title: input.title },
  });
  const postData = {
    description:
      'Khách muốn đặt một món quà thủ công có cá nhân hóa để tặng sinh nhật.',
    budgetMin: '250000',
    budgetMax: '600000',
    desiredTimeline: '2 tuần',
    referenceImages: [input.referenceImage],
    status: CommissionPostStatus.OPEN,
  };
  const post = existingPost
    ? await prisma.commissionPost.update({
        where: { id: existingPost.id },
        data: postData,
      })
    : await prisma.commissionPost.create({
        data: {
          customerId: input.customerId,
          title: input.title,
          ...postData,
        },
      });

  await prisma.commissionProposal.upsert({
    where: {
      commissionId_sellerId: {
        commissionId: post.id,
        sellerId: input.sellerId,
      },
    },
    update: {
      message:
        'Shop có thể làm bản phác thảo trong 2 ngày và hoàn thiện trong 10 ngày.',
      proposedPrice: '420000',
      proposedLeadTime: '10 ngày',
      sketchImageUrl: input.referenceImage,
      status: CommissionProposalStatus.PENDING,
    },
    create: {
      commissionId: post.id,
      sellerId: input.sellerId,
      message:
        'Shop có thể làm bản phác thảo trong 2 ngày và hoàn thiện trong 10 ngày.',
      proposedPrice: '420000',
      proposedLeadTime: '10 ngày',
      sketchImageUrl: input.referenceImage,
      status: CommissionProposalStatus.PENDING,
    },
  });
}

async function ensureFlashSale(input: {
  name: string;
  description: string;
  banner: string;
  startAt: Date;
  endAt: Date;
  isActive: boolean;
  saleState: FlashSaleState;
  categoryIds: string[];
  discountPercent: string;
}) {
  const existing = await prisma.flashSale.findFirst({
    where: { name: input.name },
  });
  const data = {
    name: input.name,
    description: input.description,
    banner: input.banner,
    startAt: input.startAt,
    endAt: input.endAt,
    isActive: input.isActive,
    saleState: input.saleState,
    maxUnits: 100,
    perUserLimit: 2,
    reserveStock: 0,
    autoPauseThreshold: 95,
    deletedAt: null,
  };
  const flashSale = existing
    ? await prisma.flashSale.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.flashSale.create({ data });

  await prisma.flashSaleCategory.deleteMany({
    where: { flashSaleId: flashSale.id },
  });
  await prisma.flashSaleRange.deleteMany({
    where: { flashSaleId: flashSale.id },
  });

  for (const categoryId of input.categoryIds) {
    await prisma.flashSaleCategory.create({
      data: { flashSaleId: flashSale.id, categoryId },
    });
  }
  await prisma.flashSaleRange.create({
    data: {
      flashSaleId: flashSale.id,
      minPrice: '0',
      maxPrice: '999999999',
      discountPercent: input.discountPercent,
      endDate: input.endAt,
    },
  });
}

async function main() {
  await prisma.platformSetting.upsert({
    where: { id: 'platform' },
    update: {
      platformName: 'HandCraft Market',
      platformDescription: 'Sàn thương mại cho sản phẩm thủ công',
      commissionBps: 1000,
    },
    create: {
      id: 'platform',
      platformName: 'HandCraft Market',
      platformDescription: 'Sàn thương mại cho sản phẩm thủ công',
      commissionBps: 1000,
    },
  });

  const categories = [
    {
      name: 'Gốm sứ thủ công',
      slug: 'ceramics',
      description: 'Ly, bình và đồ trang trí gốm sứ làm tay.',
      image: demoImages.ceramic,
    },
    {
      name: 'Vải và túi thủ công',
      slug: 'textiles',
      description: 'Túi vải, phụ kiện và sản phẩm may thủ công.',
      image: demoImages.linen,
    },
    {
      name: 'Trang sức thủ công',
      slug: 'jewelry',
      description: 'Vòng tay, dây chuyền và phụ kiện làm tay.',
      image: demoImages.jewelry,
    },
    {
      name: 'Đồ gỗ trang trí',
      slug: 'wood-decor',
      description: 'Khay gỗ, kệ nhỏ và decor nhà cửa.',
      image: demoImages.wood,
    },
    {
      name: 'Thiệp và giấy nghệ thuật',
      slug: 'paper-art',
      description: 'Thiệp, scrapbook và sản phẩm giấy thủ công.',
      image: demoImages.paper,
    },
    {
      name: 'Đồ len và crochet',
      slug: 'crochet',
      description: 'Hoa len, thú bông, lót ly và phụ kiện móc thủ công.',
    image: demoImages.crochet,
    },
    {
      name: 'Tranh và decor thủ công',
      slug: 'wall-decor',
      description:
        'Tranh, macrame và đồ trang trí làm tay cho không gian sống.',
      image: demoImages.decor,
    },
    {
      name: 'Nến thơm thủ công',
      slug: 'candles',
      description:
        'Nến sáp đậu nành, nến thơm thư giãn và set quà hương liệu làm thủ công.',
      image: demoImages.candle,
    },
    {
      name: 'Xà phòng và mỹ phẩm thủ công',
      slug: 'soap-cosmetics',
      description:
        'Xà phòng cold process, son dưỡng, muối tắm và chăm sóc cơ thể từ nguyên liệu lành tính.',
      image: demoImages.soap,
    },
    {
      name: 'Phụ kiện tóc thủ công',
      slug: 'hair-accessories',
      description:
        'Kẹp tóc, dây buộc tóc vải, băng đô và phụ kiện tóc may hoặc đính thủ công.',
      image: demoImages.hair,
    },
    {
      name: 'Đồ da thủ công',
      slug: 'leather-goods',
      description:
        'Ví da, móc khóa, bao thẻ và phụ kiện da làm tay theo phong cách bền vững.',
      image: demoImages.leather,
    },
  ];

  const categoryIds: Record<string, string> = {};
  for (const category of categories) {
    const seeded = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        ...category,
        status: CategoryStatus.ACTIVE,
        deletedAt: null,
      },
      create: {
        ...category,
        status: CategoryStatus.ACTIVE,
      },
    });
    categoryIds[category.slug] = seeded.id;
  }
  categoryIds.gifts = categoryIds.candles;

  const legacyGiftCategory = await prisma.category.findUnique({
    where: { slug: 'gifts' },
    select: { id: true },
  });

  if (legacyGiftCategory && legacyGiftCategory.id !== categoryIds.candles) {
    await prisma.product.updateMany({
      where: { categoryId: legacyGiftCategory.id },
      data: { categoryId: categoryIds.candles },
    });
    await prisma.voucher.updateMany({
      where: { categoryId: legacyGiftCategory.id },
      data: { categoryId: categoryIds.candles },
    });

    const legacyFlashSaleCategories = await prisma.flashSaleCategory.findMany({
      where: { categoryId: legacyGiftCategory.id },
      select: { id: true, flashSaleId: true },
    });
    for (const legacyFlashSaleCategory of legacyFlashSaleCategories) {
      const existingMergedCategory = await prisma.flashSaleCategory.findUnique({
        where: {
          flashSaleId_categoryId: {
            flashSaleId: legacyFlashSaleCategory.flashSaleId,
            categoryId: categoryIds.candles,
          },
        },
        select: { id: true },
      });
      if (existingMergedCategory) {
        await prisma.flashSaleCategory.delete({
          where: { id: legacyFlashSaleCategory.id },
        });
      } else {
        await prisma.flashSaleCategory.update({
          where: { id: legacyFlashSaleCategory.id },
          data: { categoryId: categoryIds.candles },
        });
      }
    }
  }

  await prisma.category.updateMany({
    where: { slug: 'gifts' },
    data: {
      status: CategoryStatus.INACTIVE,
      deletedAt: new Date(),
    },
  });

  const admin = await upsertDemoUser({
    email: 'admin@ecommerce.com',
    name: 'System Admin',
    roles: [Role.ROLE_ADMIN],
  });

  const seller = await upsertDemoUser({
    email: 'seller@ecommerce.com',
    name: 'Linh Trần',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000001',
    shopName: 'Linh Ceramic Studio',
    sellerTitle: 'Nghệ nhân gốm sứ',
    sellerBio: 'Gốm sứ làm tay với men màu ấm và kiểu dáng hiện đại.',
    sellerAbout:
      'Linh Ceramic Studio tập trung vào các sản phẩm gốm sứ dùng hằng ngày, làm thủ công theo từng mẻ nhỏ.',
    sellerHeroImage: demoImages.ceramic,
    sellerAboutImage: demoImages.wood,
    sellerStat1Label: 'Sản phẩm',
    sellerStat1Value: '12+',
    sellerStat2Label: 'Năm kinh nghiệm',
    sellerStat2Value: '5',
    artisanVerified: true,
    craftSpecialty: 'Gốm sứ gia dụng làm tay',
    craftExperienceYears: 5,
    craftMaterials: ['Đất sét', 'Men nâu', 'Men tro'],
    verificationNote:
      'Đã xác minh hồ sơ nghệ nhân và quy trình làm gốm thủ công cho demo local.',
    avatar: demoImages.ceramic,
  });

  const seller2 = await upsertDemoUser({
    email: 'seller2@ecommerce.com',
    name: 'Mai Nguyễn',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000002',
    shopName: 'Mai Handmade Gifts',
    sellerTitle: 'Nghệ nhân quà tặng',
    sellerBio: 'Quà tặng thủ công, nến thơm và phụ kiện với cá nhân hóa.',
    sellerAbout:
      'Mai Handmade Gifts tạo nến thơm, đồ vải và quà tặng cá nhân hóa cho các dịp đặc biệt.',
    sellerHeroImage: demoImages.candle,
    sellerAboutImage: demoImages.crochet,
    sellerStat1Label: 'Đơn hoàn thành',
    sellerStat1Value: '80+',
    sellerStat2Label: 'Phong cách',
    sellerStat2Value: 'Quà tặng',
    artisanVerified: true,
    craftSpecialty: 'Quà tặng cá nhân hóa và nến thơm',
    craftExperienceYears: 4,
    craftMaterials: ['Sáp đậu nành', 'Vải linen', 'Giấy kraft'],
    verificationNote:
      'Đã xác minh xưởng quà tặng thủ công, phù hợp demo nghệ nhân đã xác minh.',
    avatar: demoImages.candle,
  });

  const seller3 = await upsertDemoUser({
    email: 'seller3@ecommerce.com',
    name: 'Quang Phạm',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000003',
    shopName: 'Mộc Nhiên Studio',
    sellerTitle: 'Xưởng gỗ và da thủ công',
    sellerBio:
      'Đồ gỗ decor, ví da và phụ kiện bàn làm việc được hoàn thiện bằng tay.',
    sellerAbout:
      'Mộc Nhiên Studio ưu tiên vật liệu bền, bề mặt hoàn thiện mộc và các chi tiết sử dụng lâu dài trong không gian sống.',
    sellerHeroImage: demoImages.wood,
    sellerAboutImage: demoImages.leather,
    sellerStat1Label: 'Đơn tùy chỉnh',
    sellerStat1Value: '35+',
    sellerStat2Label: 'Chất liệu',
    sellerStat2Value: 'Gỗ & da',
    craftSpecialty: 'Đồ gỗ decor và phụ kiện da',
    craftExperienceYears: 6,
    craftMaterials: ['Gỗ cao su', 'Da bò', 'Dầu lau gỗ'],
    avatar: demoImages.wood,
  });

  const seller4 = await upsertDemoUser({
    email: 'seller4@ecommerce.com',
    name: 'Mây Lê',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000004',
    shopName: 'Len Nhà Mây',
    sellerTitle: 'Crochet và đồ len cotton',
    sellerBio:
      'Thú bông len, túi crochet, phụ kiện len mềm và các món quà nhỏ móc tay.',
    sellerAbout:
      'Len Nhà Mây làm từng sản phẩm bằng len cotton mềm, ưu tiên màu pastel và kích thước gọn cho quà tặng cá nhân.',
    sellerHeroImage: demoImages.crochet,
    sellerAboutImage: demoImages.gift,
    sellerStat1Label: 'Mẫu len',
    sellerStat1Value: '24+',
    sellerStat2Label: 'Thời gian',
    sellerStat2Value: '3-7 ngày',
    craftSpecialty: 'Crochet và quà tặng len',
    craftExperienceYears: 3,
    craftMaterials: ['Len cotton', 'Sợi acrylic', 'Phụ kiện móc khóa'],
    avatar: demoImages.crochet,
  });

  const seller5 = await upsertDemoUser({
    email: 'seller5@ecommerce.com',
    name: 'An Nhiên',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000005',
    shopName: 'Gốm An Nhiên',
    sellerTitle: 'Gốm thủ công men tự nhiên',
    sellerBio:
      'Ly, chén, bình hoa và đồ bàn ăn gốm thủ công với tông men tự nhiên.',
    sellerAbout:
      'Gốm An Nhiên làm theo mẻ nhỏ, mỗi sản phẩm có biến thiên men nhẹ nên phù hợp với người thích đồ thủ công độc bản.',
    sellerHeroImage: demoImages.ceramic,
    sellerAboutImage: demoImages.decor,
    sellerStat1Label: 'Mẻ gốm',
    sellerStat1Value: '18+',
    sellerStat2Label: 'Phong cách',
    sellerStat2Value: 'Wabi-sabi',
    craftSpecialty: 'Gốm men tự nhiên',
    craftExperienceYears: 7,
    craftMaterials: ['Đất sét trắng', 'Men tự nhiên', 'Tro thực vật'],
    avatar: demoImages.ceramic,
  });

  const seller6 = await upsertDemoUser({
    email: 'seller6@ecommerce.com',
    name: 'Hà Chi',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000006',
    shopName: 'Nến Thơm Hoa Cỏ',
    sellerTitle: 'Nến thơm và chăm sóc cơ thể',
    sellerBio:
      'Nến sáp đậu nành, xà phòng thủ công và bộ thư giãn từ hương hoa cỏ.',
    sellerAbout:
      'Nến Thơm Hoa Cỏ dùng sáp thực vật, tinh dầu dịu nhẹ và bao bì giấy tái chế để tạo quà tặng chăm sóc bản thân.',
    sellerHeroImage: demoImages.candle,
    sellerAboutImage: demoImages.soap,
    sellerStat1Label: 'Mùi hương',
    sellerStat1Value: '16+',
    sellerStat2Label: 'Lưu hương',
    sellerStat2Value: 'Nhẹ dịu',
    craftSpecialty: 'Nến thơm thực vật và xà phòng thủ công',
    craftExperienceYears: 4,
    craftMaterials: ['Sáp đậu nành', 'Tinh dầu', 'Dầu dừa'],
    avatar: demoImages.soap,
  });

  const customer = await upsertDemoUser({
    email: 'customer@ecommerce.com',
    name: 'Minh Anh',
    roles: [Role.ROLE_USER],
    phone: '0902000001',
    avatar: demoImages.linen,
  });

  const customer2 = await upsertDemoUser({
    email: 'customer2@ecommerce.com',
    name: 'Hoàng Nam',
    roles: [Role.ROLE_USER],
    phone: '0902000002',
    avatar: demoImages.wood,
  });

  const customer3 = await upsertDemoUser({
    email: 'customer3@ecommerce.com',
    name: 'Thu Hà',
    roles: [Role.ROLE_USER],
    phone: '0902000003',
    avatar: demoImages.paper,
  });

  const customer4 = await upsertDemoUser({
    email: 'customer4@ecommerce.com',
    name: 'Bảo Ngọc',
    roles: [Role.ROLE_USER],
    phone: '0902000004',
    avatar: demoImages.gift,
  });

  const customer5 = await upsertDemoUser({
    email: 'customer5@ecommerce.com',
    name: 'Tuấn Khang',
    roles: [Role.ROLE_USER],
    phone: '0902000005',
    avatar: demoImages.leather,
  });

  const customer6 = await upsertDemoUser({
    email: 'customer6@ecommerce.com',
    name: 'Lan Vy',
    roles: [Role.ROLE_USER],
    phone: '0902000006',
    avatar: demoImages.ceramic,
  });

  const extraCustomers = await Promise.all(
    [
      'Gia Hân',
      'Khánh Linh',
      'Phuong Mai',
      'Đức Anh',
      'Ngọc Huyền',
      'Thanh Tâm',
      'Quỳnh Nhu',
      'Anh Khoa',
      'Mỹ Duyên',
      'Hải Đăng',
      'Tường Vy',
      'Minh Quân',
      'Bạch Ngọc',
      'Việt An',
    ].map((name, index) =>
      upsertDemoUser({
        email: `customer${index + 7}@ecommerce.com`,
        name,
        roles: [Role.ROLE_USER],
        phone: `09020000${String(index + 7).padStart(2, '0')}`,
        avatar: [
          demoImages.ceramic,
          demoImages.linen,
          demoImages.paper,
          demoImages.gift,
          demoImages.decor,
        ][index % 5],
      }),
    ),
  );

  const sellerShippingProfiles = {
    ceramicStandard: await ensureShippingProfile({
      sellerId: seller.id,
      name: 'Giao gốm tiêu chuẩn',
      carrierName: 'GHN',
      trackingUrlTemplate: 'https://ghn.vn/blogs/tracking?order_code={trackingCode}',
      processingMinDays: 1,
      processingMaxDays: 3,
      transitMinDays: 2,
      transitMaxDays: 4,
      isDefault: true,
    }),
    ceramicCareful: await ensureShippingProfile({
      sellerId: seller.id,
      name: 'Gói chống sốc cho gốm',
      carrierName: 'Viettel Post',
      trackingUrlTemplate: 'https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/?order={trackingCode}',
      processingMinDays: 2,
      processingMaxDays: 4,
      transitMinDays: 3,
      transitMaxDays: 5,
    }),
    giftStandard: await ensureShippingProfile({
      sellerId: seller2.id,
      name: 'Giao quà handmade',
      carrierName: 'GHTK',
      trackingUrlTemplate: 'https://i.ghtk.vn/{trackingCode}',
      processingMinDays: 1,
      processingMaxDays: 2,
      transitMinDays: 2,
      transitMaxDays: 4,
      isDefault: true,
    }),
    madeToOrder: await ensureShippingProfile({
      sellerId: seller4.id,
      name: 'Sản phẩm móc len theo yêu cầu',
      carrierName: 'GHN',
      trackingUrlTemplate: 'https://ghn.vn/blogs/tracking?order_code={trackingCode}',
      processingMinDays: 3,
      processingMaxDays: 7,
      transitMinDays: 2,
      transitMaxDays: 4,
      isDefault: true,
    }),
    candleFast: await ensureShippingProfile({
      sellerId: seller6.id,
      name: 'Giao nhanh nến thơm',
      carrierName: 'J&T Express',
      trackingUrlTemplate: 'https://jtexpress.vn/vi/tracking?billcode={trackingCode}',
      processingMinDays: 1,
      processingMaxDays: 2,
      transitMinDays: 1,
      transitMaxDays: 3,
      isDefault: true,
    }),
  };

  await Promise.all([
    ensureDefaultAddress(customer.id),
    ensureDefaultAddress(customer2.id),
    ensureDefaultAddress(customer3.id),
    ensureDefaultAddress(customer4.id),
    ensureDefaultAddress(customer5.id),
    ensureDefaultAddress(customer6.id),
    ...extraCustomers.map((extraCustomer) =>
      ensureDefaultAddress(extraCustomer.id),
    ),
    ensureMediaLibrary(seller.id, [
      demoImages.ceramic,
      demoImages.jewelry,
      demoImages.wood,
      demoImages.decor,
    ]),
    ensureMediaLibrary(seller2.id, [
      demoImages.linen,
      demoImages.candle,
      demoImages.paper,
      demoImages.crochet,
    ]),
    ensureMediaLibrary(seller3.id, [
      demoImages.wood,
      demoImages.leather,
      demoImages.decor,
    ]),
    ensureMediaLibrary(seller4.id, [
      demoImages.crochet,
      demoImages.gift,
      demoImages.hair,
    ]),
    ensureMediaLibrary(seller5.id, [
      demoImages.ceramic,
      demoImages.decor,
      demoImages.paper,
    ]),
    ensureMediaLibrary(seller6.id, [
      demoImages.candle,
      demoImages.soap,
      demoImages.gift,
    ]),
  ]);

  const mug = await upsertProduct({
    sku: 'DEMO-CERAMIC-MUG',
    name: 'Ly gốm men nâu làm tay',
    description:
      'Ly gốm dung tích 300ml, được tạo hình và phủ men thủ công. Phù hợp làm quà tặng hoặc dùng hằng ngày.',
    price: '180000',
    categoryId: categoryIds.ceramics,
    sellerId: seller.id,
    stock: 24,
    lowStockThreshold: 5,
    tags: ['gom-su', 'qua-tang', 'handmade'],
    image: demoImages.ceramic,
    shippingProfileId: sellerShippingProfiles.ceramicStandard.id,
    optionColors: ['Nâu đất', 'Trắng ngà'],
    optionMaterials: ['Gốm men thủ công'],
    optionSizes: ['300ml', '450ml'],
    processingTime: '2-4 ngày',
  });

  const tote = await upsertProduct({
    sku: 'DEMO-LINEN-TOTE',
    name: 'Túi vải linen thêu tay',
    description:
      'Túi linen có quai dây, thêu họa tiết nhỏ bằng tay. Chất liệu bền và dễ phối đồ.',
    price: '220000',
    categoryId: categoryIds.textiles,
    sellerId: seller2.id,
    stock: 18,
    lowStockThreshold: 4,
    tags: ['vai', 'tui', 'theu-tay'],
    image: demoImages.linen,
    shippingProfileId: sellerShippingProfiles.giftStandard.id,
    optionColors: ['Be tự nhiên', 'Xanh rêu', 'Nâu nhạt'],
    optionMaterials: ['Vải linen', 'Vải canvas'],
    optionSizes: ['Nhỏ', 'Vừa'],
    processingTime: '3-5 ngày',
  });

  const candle = await upsertProduct({
    sku: 'DEMO-SOY-CANDLE',
    name: 'Nến thơm đậu nành hương mộc',
    description:
      'Nến thơm sáp đậu nành trong cốc gốm nhỏ, mùi hương dịu nhẹ cho bàn làm việc và phòng ngủ.',
    price: '150000',
    categoryId: categoryIds.candles,
    sellerId: seller2.id,
    stock: 30,
    lowStockThreshold: 6,
    tags: ['nen-thom', 'qua-tang'],
    image: demoImages.candle,
    shippingProfileId: sellerShippingProfiles.giftStandard.id,
    optionColors: ['Trắng sữa', 'Vàng mật ong'],
    optionMaterials: ['Sáp đậu nành', 'Tim bấc cotton'],
    optionSizes: ['120g', '200g'],
    processingTime: '1-2 ngày',
  });

  const bracelet = await upsertProduct({
    sku: 'DEMO-SILVER-BRACELET',
    name: 'Vòng tay bạc đan hạt gốm',
    description:
      'Vòng tay bạc tối giản kết hợp hạt gốm nhỏ, có thể điều chỉnh kích thước.',
    price: '320000',
    categoryId: categoryIds.jewelry,
    sellerId: seller.id,
    stock: 12,
    lowStockThreshold: 3,
    tags: ['trang-suc', 'bac', 'gom'],
    image: demoImages.jewelry,
    shippingProfileId: sellerShippingProfiles.ceramicCareful.id,
    optionColors: ['Bạc', 'Xanh ngọc', 'Nâu gốm'],
    optionMaterials: ['Bạc 925', 'Hạt gốm'],
    optionSizes: ['16cm', '18cm', '20cm'],
    processingTime: '3-5 ngày',
  });

  const woodTray = await upsertProduct({
    sku: 'DEMO-WOODEN-TRAY',
    name: 'Khay gỗ decor phòng khách',
    description:
      'Khay gỗ nhỏ được chà nhám và phủ dầu bảo vệ, dùng để decor bàn trà hoặc kệ sách.',
    price: '260000',
    categoryId: categoryIds['wood-decor'],
    sellerId: seller.id,
    stock: 10,
    lowStockThreshold: 2,
    tags: ['go', 'decor'],
    image: demoImages.wood,
  });

  const paperCard = await upsertProduct({
    sku: 'DEMO-PAPER-CARD',
    name: 'Thiệp giấy ép hoa khô',
    description:
      'Thiệp thủ công ép hoa khô, có phong bì kèm theo, phù hợp sinh nhật và kỷ niệm.',
    price: '65000',
    categoryId: categoryIds['paper-art'],
    sellerId: seller2.id,
    stock: 40,
    lowStockThreshold: 8,
    tags: ['thiep', 'giay', 'qua-tang'],
    image: demoImages.paper,
  });

  const products = {
    mug,
    tote,
    candle,
    bracelet,
    woodTray,
    paperCard,
    ceramicBowl: await upsertProduct({
      sku: 'DEMO-CERAMIC-BOWL',
      name: 'Bát gốm men kem vẽ tay',
      description:
        'Bát gốm nhỏ phủ men kem, viền vẽ tay, phù hợp dùng cho bữa sáng hoặc decor bàn ăn.',
      price: '165000',
      categoryId: categoryIds.ceramics,
      sellerId: seller5.id,
      stock: 20,
      lowStockThreshold: 5,
      tags: ['gom-su', 'bat', 'men-kem'],
      image: demoImages.ceramic,
    }),
    ceramicVase: await upsertProduct({
      sku: 'DEMO-CERAMIC-VASE',
      name: 'Bình gốm mini cắm hoa khô',
      description:
        'Bình gốm dáng trụ nhỏ, màu men nâu đất, dùng cắm hoa khô hoặc trang trí kệ sách.',
      price: '240000',
      categoryId: categoryIds.ceramics,
      sellerId: seller5.id,
      stock: 14,
      lowStockThreshold: 3,
      tags: ['gom-su', 'binh-hoa', 'decor'],
      image: demoImages.ceramic,
    }),
    incenseHolder: await upsertProduct({
      sku: 'DEMO-INCENSE-HOLDER',
      name: 'Đế đặt trầm gốm thủ công',
      description:
        'Đế đặt trầm men mờ, tạo hình thủ công, hợp với góc làm việc hoặc phòng thiền.',
      price: '125000',
      categoryId: categoryIds.ceramics,
      sellerId: seller.id,
      stock: 16,
      lowStockThreshold: 4,
      tags: ['gom-su', 'tram', 'decor'],
      image: demoImages.ceramic,
    }),
    embroideredPouch: await upsertProduct({
      sku: 'DEMO-EMBROIDERED-POUCH',
      name: 'Ví vải thêu hoa lavender',
      description:
        'Ví vải nhỏ có khóa kéo, thêu hoa lavender bằng tay, dùng đựng mỹ phẩm hoặc phụ kiện.',
      price: '145000',
      categoryId: categoryIds.textiles,
      sellerId: seller2.id,
      stock: 22,
      lowStockThreshold: 5,
      tags: ['vai', 'vi', 'theu-tay'],
      image: demoImages.linen,
    }),
    fabricHeadband: await upsertProduct({
      sku: 'DEMO-FABRIC-HEADBAND',
      name: 'Băng đô vải linen thắt nơ',
      description:
        'Băng đô linen mềm, may thủ công, phối được với trang phục tối giản hằng ngày.',
      price: '85000',
      categoryId: categoryIds.textiles,
      sellerId: seller2.id,
      stock: 35,
      lowStockThreshold: 8,
      tags: ['vai', 'phu-kien', 'linen'],
      image: demoImages.linen,
    }),
    candleGiftSet: await upsertProduct({
      sku: 'DEMO-CANDLE-GIFT-SET',
      name: 'Set nến thơm quà tặng 3 mùi',
      description:
        'Bộ 3 nến thơm size mini gồm gỗ tuyết tùng, cam ngọt và trà trắng, dùng hộp quà.',
      price: '290000',
      categoryId: categoryIds.candles,
      sellerId: seller2.id,
      stock: 18,
      lowStockThreshold: 4,
      tags: ['nen-thom', 'qua-tang', 'set'],
      image: demoImages.candle,
    }),
    ceramicPlanter: await upsertProduct({
      sku: 'DEMO-CERAMIC-PLANTER-SOLDOUT',
      name: 'Chậu cây gốm men rêu',
      description:
        'Chậu cây gốm men rêu kích thước nhỏ cho sen đá, hiện dùng để demo trạng thái hết hàng.',
      price: '210000',
      categoryId: categoryIds.ceramics,
      sellerId: seller5.id,
      stock: 0,
      lowStockThreshold: 3,
      tags: ['gom-su', 'chau-cay', 'het-hang'],
      image: demoImages.ceramic,
    }),
    beadedNecklace: await upsertProduct({
      sku: 'DEMO-BEADED-NECKLACE',
      name: 'Dây chuyền hạt gốm phối bạc',
      description:
        'Dây chuyền hạt gốm nhỏ phối charm bạc, làm thủ công theo tông màu trung tính.',
      price: '360000',
      categoryId: categoryIds.jewelry,
      sellerId: seller.id,
      stock: 9,
      lowStockThreshold: 2,
      tags: ['trang-suc', 'day-chuyen', 'gom'],
      image: demoImages.jewelry,
    }),
    wovenEarrings: await upsertProduct({
      sku: 'DEMO-WOVEN-EARRINGS',
      name: 'Khuyên tai đan sợi màu đất',
      description:
        'Khuyên tai nhỏ, đan sợi thủ công với vòng kim loại chống gỉ, phù hợp phong cách boho.',
      price: '175000',
      categoryId: categoryIds.jewelry,
      sellerId: seller2.id,
      stock: 15,
      lowStockThreshold: 3,
      tags: ['trang-suc', 'khuyen-tai', 'boho'],
      image: demoImages.jewelry,
    }),
    phoneStand: await upsertProduct({
      sku: 'DEMO-WOOD-PHONE-STAND',
      name: 'Giá đỡ điện thoại gỗ óc chó',
      description:
        'Giá đỡ điện thoại chà nhám thủ công, phủ dầu bảo vệ, dùng tốt trên bàn làm việc.',
      price: '185000',
      categoryId: categoryIds['wood-decor'],
      sellerId: seller.id,
      stock: 17,
      lowStockThreshold: 4,
      tags: ['go', 'ban-lam-viec', 'decor'],
      image: demoImages.wood,
    }),
    miniShelf: await upsertProduct({
      sku: 'DEMO-WOOD-MINI-SHELF',
      name: 'Kệ gỗ mini treo tường',
      description:
        'Kệ gỗ mini để cây nhỏ, nến thơm hoặc đồ sưu tầm, hoàn thiện bằng dầu tự nhiên.',
      price: '310000',
      categoryId: categoryIds['wood-decor'],
      sellerId: seller.id,
      stock: 7,
      lowStockThreshold: 2,
      tags: ['go', 'ke-tuong', 'decor'],
      image: demoImages.wood,
    }),
    scrapbookKit: await upsertProduct({
      sku: 'DEMO-SCRAPBOOK-KIT',
      name: 'Bộ sổ lưu niệm thủ công',
      description:
        'Bộ giấy, hình dán và thiệp nhỏ để tự làm sổ lưu niệm gắn ảnh và lời nhắn.',
      price: '135000',
      categoryId: categoryIds['paper-art'],
      sellerId: seller2.id,
      stock: 26,
      lowStockThreshold: 6,
      tags: ['giay', 'scrapbook', 'qua-tang'],
      image: demoImages.paper,
    }),
    bookmark: await upsertProduct({
      sku: 'DEMO-PAPER-BOOKMARK',
      name: 'Bookmark giấy dó vẽ tay',
      description:
        'Bookmark giấy dó ép hoa, vẽ tay từng chiếc, phù hợp làm quà nhỏ cho người thích đọc sách.',
      price: '45000',
      categoryId: categoryIds['paper-art'],
      sellerId: seller2.id,
      stock: 50,
      lowStockThreshold: 10,
      tags: ['giay', 'bookmark', 'qua-tang'],
      image: demoImages.paper,
    }),
    crochetKeychain: await upsertProduct({
      sku: 'DEMO-CROCHET-FLOWER-KEYCHAIN',
      name: 'Móc khóa hoa len móc tay',
      description:
        'Móc khóa hoa len nhỏ, móc tay bằng sợi cotton, có thể gắn túi hoặc chùa khóa.',
      price: '75000',
      categoryId: categoryIds.crochet,
      sellerId: seller2.id,
      stock: 32,
      lowStockThreshold: 7,
      tags: ['crochet', 'len', 'moc-khoa'],
      image: demoImages.crochet,
    }),
    crochetCoaster: await upsertProduct({
      sku: 'DEMO-CROCHET-COASTER',
      name: 'Bộ lót ly len móc tay',
      description:
        'Bộ 4 lót ly crochet màu kem, phù hợp bàn trà hoặc góc làm việc.',
      price: '120000',
      categoryId: categoryIds.crochet,
      sellerId: seller2.id,
      stock: 24,
      lowStockThreshold: 5,
      tags: ['crochet', 'lot-ly', 'len'],
      image: demoImages.crochet,
    }),
    crochetBearPending: await upsertProduct({
      sku: 'DEMO-CROCHET-BEAR-PENDING',
      name: 'Gấu len crochet chờ duyệt',
      description:
        'Sản phẩm demo trạng thái chờ duyệt để admin thực hiện approve trong buổi chấm.',
      price: '260000',
      categoryId: categoryIds.crochet,
      sellerId: seller2.id,
      stock: 8,
      lowStockThreshold: 2,
      tags: ['crochet', 'thu-bong', 'pending'],
      image: demoImages.crochet,
      status: ProductStatus.PENDING,
    }),
    rejectedWallArt: await upsertProduct({
      sku: 'DEMO-WALL-ART-REJECTED',
      name: 'Tranh decor demo bị từ chối',
      description:
        'Sản phẩm demo trạng thái từ chối để admin/seller kiểm tra UI moderation.',
      price: '390000',
      categoryId: categoryIds['wall-decor'],
      sellerId: seller2.id,
      stock: 5,
      lowStockThreshold: 1,
      tags: ['decor', 'rejected', 'demo'],
      image: demoImages.decor,
      status: ProductStatus.REJECTED,
    }),
    macrameWallHanging: await upsertProduct({
      sku: 'DEMO-MACRAME-WALL-HANGING',
      name: 'Macrame treo tường cotton',
      description:
        'Tấm macrame treo tường đan thủ công bằng sợi cotton, tạo điểm nhấn cho phòng ngủ.',
      price: '420000',
      categoryId: categoryIds['wall-decor'],
      sellerId: seller2.id,
      stock: 11,
      lowStockThreshold: 3,
      tags: ['macrame', 'decor', 'cotton'],
      image: demoImages.decor,
    }),
    pressedFlowerFrame: await upsertProduct({
      sku: 'DEMO-PRESSED-FLOWER-FRAME',
      name: 'Khung tranh hoa ép thủ công',
      description:
        'Khung tranh nhỏ dùng hoa khô ép thật, phù hợp trang trí bàn làm việc hoặc tặng bạn bè.',
      price: '280000',
      categoryId: categoryIds['wall-decor'],
      sellerId: seller2.id,
      stock: 13,
      lowStockThreshold: 3,
      tags: ['tranh', 'hoa-kho', 'decor'],
      image: demoImages.decor,
    }),
    weddingCardSet: await upsertProduct({
      sku: 'DEMO-WEDDING-CARD-SET',
      name: 'Set thiệp cưới giấy kraft',
      description:
        'Set thiệp cưới phong cách mộc với giấy kraft, dây gai và hoa khô trang trí.',
      price: '210000',
      categoryId: categoryIds['paper-art'],
      sellerId: seller2.id,
      stock: 20,
      lowStockThreshold: 4,
      tags: ['thiep-cuoi', 'giay', 'hoa-kho'],
      image: demoImages.paper,
    }),
    customNameBracelet: await upsertProduct({
      sku: 'DEMO-CUSTOM-NAME-BRACELET',
      name: 'Vòng tay khắc tên theo yêu cầu',
      description:
        'Vòng tay dây da phối charm kim loại, có thể khắc tên ngắn theo yêu cầu của khách.',
      price: '245000',
      categoryId: categoryIds.jewelry,
      sellerId: seller.id,
      stock: 16,
      lowStockThreshold: 4,
      tags: ['trang-suc', 'ca-nhan-hoa', 'qua-tang'],
      image: demoImages.jewelry,
    }),
  };

  const expandedProducts = await upsertProducts([
    {
      sku: 'DEMO-CANVAS-CROSSBODY-BAG',
      name: 'Túi canvas đeo chéo thêu lá',
      description:
        'Túi canvas dày, đeo chéo tiện đi học hoặc đi cà phê, mặt trước thêu họa tiết lá xanh bằng tay.',
      price: '285000',
      categoryId: categoryIds.textiles,
      sellerId: seller2.id,
      stock: 18,
      lowStockThreshold: 4,
      tags: ['tui-canvas', 'theu-tay', 'vai'],
      image: demoImages.linen,
    },
    {
      sku: 'DEMO-PATCHWORK-COIN-PURSE',
      name: 'Ví xu patchwork vải vụn',
      description:
        'Ví xu nhỏ ghép từ vải vụn cotton, có lót trong và khóa kéo chắc chắn, phù hợp đựng tai nghe hoặc tiền lẻ.',
      price: '95000',
      categoryId: categoryIds.textiles,
      sellerId: seller2.id,
      stock: 30,
      lowStockThreshold: 6,
      tags: ['vi-vai', 'patchwork', 'tai-che'],
      image: demoImages.linen,
    },
    {
      sku: 'DEMO-PERSONALIZED-GIFT-BOX',
      name: 'Hộp quà cá nhân hóa giấy kraft',
      description:
        'Hộp quà giấy kraft kèm tag tên, dây gai và hoa khô, có thể phối với nến hoặc thiệp theo yêu cầu.',
      price: '180000',
      categoryId: categoryIds.candles,
      sellerId: seller6.id,
      stock: 25,
      lowStockThreshold: 5,
      tags: ['qua-tang', 'ca-nhan-hoa', 'hop-qua'],
      image: demoImages.gift,
    },
    {
      sku: 'DEMO-MINI-GIFT-TAG-SET',
      name: 'Set tag quà mini viết tay',
      description:
        'Bộ 12 thẻ quà tặng mini bằng giấy mỹ thuật, viền xé tay nhẹ, thích hợp dùng cho tiệc nhỏ hoặc gói quà thủ công.',
      price: '55000',
      categoryId: categoryIds.candles,
      sellerId: seller2.id,
      stock: 45,
      lowStockThreshold: 10,
      tags: ['tag-qua', 'giay', 'qua-tang'],
      image: demoImages.gift,
    },
    {
      sku: 'DEMO-ENGRAVED-WOOD-KEYCHAIN',
      name: 'Móc khóa gỗ khắc tên',
      description:
        'Móc khóa gỗ nhỏ được chà nhẵn, khắc tên hoặc ngày kỷ niệm, phủ dầu bảo vệ bề mặt.',
      price: '85000',
      categoryId: categoryIds.candles,
      sellerId: seller3.id,
      stock: 34,
      lowStockThreshold: 7,
      tags: ['moc-khoa', 'go', 'ca-nhan-hoa'],
      image: demoImages.gift,
    },
    {
      sku: 'DEMO-RESIN-FLOWER-RING',
      name: 'Nhẫn resin hoa khô trong suốt',
      description:
        'Nhẫn resin đổ tay với cánh hoa khô nhỏ, dáng mảnh, hợp phong cách nhẹ nhàng và tối giản.',
      price: '135000',
      categoryId: categoryIds.jewelry,
      sellerId: seller4.id,
      stock: 19,
      lowStockThreshold: 4,
      tags: ['trang-suc', 'resin', 'hoa-kho'],
      image: demoImages.jewelry,
    },
    {
      sku: 'DEMO-PEARL-ANKLET',
      name: 'Lắc chân ngọc trai giả phối đá',
      description:
        'Lắc chân dây mảnh phối ngọc trai giả và đá nhỏ màu sữa, có dây nối điều chỉnh kích thước.',
      price: '155000',
      categoryId: categoryIds.jewelry,
      sellerId: seller2.id,
      stock: 17,
      lowStockThreshold: 4,
      tags: ['trang-suc', 'lac-chan', 'ngoc-trai'],
      image: demoImages.jewelry,
    },
    {
      sku: 'DEMO-WOOD-DESK-ORGANIZER',
      name: 'Khay gỗ để bút và danh thiếp',
      description:
        'Khay gỗ để bàn có 3 ngăn nhỏ cho bút, card và kẹp giấy, hoàn thiện mộc phù hợp góc làm việc.',
      price: '340000',
      categoryId: categoryIds['wood-decor'],
      sellerId: seller3.id,
      stock: 12,
      lowStockThreshold: 3,
      tags: ['go', 'ban-lam-viec', 'sap-xep'],
      image: demoImages.wood,
    },
    {
      sku: 'DEMO-WOOD-COASTER-SET',
      name: 'Bộ lót ly gỗ bo tròn',
      description:
        'Bộ 4 lót ly gỗ được bo cạnh và phủ dầu thực vật, vân gỗ tự nhiên mỗi chiếc hơi khác nhau.',
      price: '210000',
      categoryId: categoryIds['wood-decor'],
      sellerId: seller3.id,
      stock: 22,
      lowStockThreshold: 5,
      tags: ['go', 'lot-ly', 'decor'],
      image: demoImages.wood,
    },
    {
      sku: 'DEMO-HANDMADE-NOTEBOOK',
      name: 'Sổ tay bìa giấy dó khâu gáy',
      description:
        'Sổ tay giấy dó bìa mềm, khâu gáy thủ công, giấy bên trong dày vừa để viết nhật ký hoặc sketch nhỏ.',
      price: '98000',
      categoryId: categoryIds['paper-art'],
      sellerId: seller2.id,
      stock: 28,
      lowStockThreshold: 6,
      tags: ['so-tay', 'giay-do', 'khau-gay'],
      image: demoImages.paper,
    },
    {
      sku: 'DEMO-CROCHET-TULIP-BOUQUET',
      name: 'Bó hoa tulip len móc tay',
      description:
        'Bó 5 bông tulip len cotton, màu pastel, không héo và có thể đặt phối màu theo ghi chú.',
      price: '320000',
      categoryId: categoryIds.crochet,
      sellerId: seller4.id,
      stock: 13,
      lowStockThreshold: 3,
      tags: ['crochet', 'hoa-len', 'qua-tang'],
      image: demoImages.crochet,
    },
    {
      sku: 'DEMO-CROCHET-MINI-BAG',
      name: 'Túi len crochet mini màu kem',
      description:
        'Túi len móc tay dáng mini, quai ngắn, đủ đựng điện thoại và ví nhỏ, nên giặt tay nhẹ.',
      price: '260000',
      categoryId: categoryIds.crochet,
      sellerId: seller4.id,
      stock: 10,
      lowStockThreshold: 2,
      tags: ['crochet', 'tui-len', 'cotton'],
      image: demoImages.crochet,
    },
    {
      sku: 'DEMO-CROCHET-BUNNY-CHARM',
      name: 'Charm thú len móc tay',
      description:
        'Charm thú len kích thước nhỏ, có móc cài kim loại, phù hợp gắn balo hoặc làm quà cho trẻ nhỏ.',
      price: '69000',
      categoryId: categoryIds.crochet,
      sellerId: seller4.id,
      stock: 36,
      lowStockThreshold: 8,
      tags: ['crochet', 'moc-khoa', 'thu-bong'],
      image: demoImages.crochet,
    },
    {
      sku: 'DEMO-LINEN-WALL-BANNER',
      name: 'Tranh vải linen chữ thêu tay',
      description:
        'Banner vải linen treo tường với chữ thêu tay ngắn, tông màu trung tính cho góc học tập hoặc phòng ngủ.',
      price: '380000',
      categoryId: categoryIds['wall-decor'],
      sellerId: seller2.id,
      stock: 9,
      lowStockThreshold: 2,
      tags: ['tranh-vai', 'theu-tay', 'decor'],
      image: demoImages.decor,
    },
    {
      sku: 'DEMO-WOOD-FRAME-POSTER',
      name: 'Tranh poster khung gỗ thủ công',
      description:
        'Tranh poster giấy mỹ thuật kèm khung gỗ mỏng, phù hợp decor phòng khách hoặc góc đọc sách.',
      price: '520000',
      categoryId: categoryIds['wall-decor'],
      sellerId: seller3.id,
      stock: 8,
      lowStockThreshold: 2,
      tags: ['tranh', 'khung-go', 'decor'],
      image: demoImages.decor,
    },
    {
      sku: 'DEMO-LAVENDER-SOY-CANDLE',
      name: 'Nến thơm lavender sáp đậu nành',
      description:
        'Nến 180g hương lavender dịu, sáp đậu nành và tim cotton, thời gian cháy khoảng 32-36 giờ.',
      price: '185000',
      categoryId: categoryIds.candles,
      sellerId: seller6.id,
      stock: 26,
      lowStockThreshold: 6,
      tags: ['nen-thom', 'lavender', 'sap-dau-nanh'],
      image: demoImages.candle,
    },
    {
      sku: 'DEMO-VANILLA-CANDLE-TIN',
      name: 'Nến vanilla hũ thiếc du lịch',
      description:
        'Nến hũ thiếc 120g mùi vanilla ấm, gọn nhẹ để mang đi du lịch hoặc đặt trong phòng làm việc.',
      price: '145000',
      categoryId: categoryIds.candles,
      sellerId: seller6.id,
      stock: 32,
      lowStockThreshold: 8,
      tags: ['nen-thom', 'vanilla', 'travel-tin'],
      image: demoImages.candle,
    },
    {
      sku: 'DEMO-SANDALWOOD-CANDLE',
      name: 'Nến gỗ đàn hương và hổ phách',
      description:
        'Nến thơm tông gỗ 220g, hương đàn hương pha hổ phách, phù hợp buổi tối thư giãn.',
      price: '260000',
      categoryId: categoryIds.candles,
      sellerId: seller6.id,
      stock: 18,
      lowStockThreshold: 4,
      tags: ['nen-thom', 'go-dan-huong', 'thu-gian'],
      image: demoImages.candle,
    },
    {
      sku: 'DEMO-JASMINE-WAX-MELT',
      name: 'Sáp thơm hoa nhài dạng viên',
      description:
        'Hộp 8 viên sáp thơm hoa nhài, dùng với đèn đốt sáp, mùi nhẹ và không quá ngọt.',
      price: '120000',
      categoryId: categoryIds.candles,
      sellerId: seller6.id,
      stock: 40,
      lowStockThreshold: 10,
      tags: ['sap-thom', 'hoa-nhai', 'wax-melt'],
      image: demoImages.candle,
    },
    {
      sku: 'DEMO-CITRUS-CANDLE-GIFT',
      name: 'Nến cam quế hộp quà nhỏ',
      description:
        'Nến cam quế 160g kèm hộp giấy kraft, hợp làm quà sinh nhật hoặc quà cảm ơn.',
      price: '210000',
      categoryId: categoryIds.candles,
      sellerId: seller6.id,
      stock: 22,
      lowStockThreshold: 5,
      tags: ['nen-thom', 'cam-que', 'qua-tang'],
      image: demoImages.candle,
    },
    {
      sku: 'DEMO-LEMONGRASS-SOAP',
      name: 'Xà phòng sả chanh quy trình lạnh',
      description:
        'Bánh xà phòng 95g làm theo phương pháp ép lạnh, hương sả chanh sạch mát, thích hợp da thường.',
      price: '85000',
      categoryId: categoryIds['soap-cosmetics'],
      sellerId: seller6.id,
      stock: 44,
      lowStockThreshold: 10,
      tags: ['xa-phong', 'sa-chanh', 'cold-process'],
      image: demoImages.soap,
    },
    {
      sku: 'DEMO-OAT-HONEY-SOAP',
      name: 'Xà phòng yến mạch mật ong',
      description:
        'Xà phòng yến mạch và mật ong có hạt tẩy da chết mịn, mùi dịu, phù hợp dùng cho thói quen tắm thư giãn hằng ngày.',
      price: '95000',
      categoryId: categoryIds['soap-cosmetics'],
      sellerId: seller6.id,
      stock: 38,
      lowStockThreshold: 8,
      tags: ['xa-phong', 'yen-mach', 'mat-ong'],
      image: demoImages.soap,
    },
    {
      sku: 'DEMO-COCOA-LIP-BALM',
      name: 'Son dưỡng cacao thủ công',
      description:
        'Son dưỡng dạng thỏi với bơ cacao và dầu hạnh nhân, không màu, phù hợp dùng hằng ngày.',
      price: '65000',
      categoryId: categoryIds['soap-cosmetics'],
      sellerId: seller6.id,
      stock: 52,
      lowStockThreshold: 12,
      tags: ['son-duong', 'cacao', 'handmade'],
      image: demoImages.soap,
    },
    {
      sku: 'DEMO-HERBAL-BATH-SALT',
      name: 'Muối tắm thảo mộc hoa cúc',
      description:
        'Lọ muối tắm 250g phối hoa cúc khô và tinh dầu dịu nhẹ, dùng cho ngâm chân hoặc tắm thư giãn.',
      price: '135000',
      categoryId: categoryIds['soap-cosmetics'],
      sellerId: seller6.id,
      stock: 24,
      lowStockThreshold: 5,
      tags: ['muoi-tam', 'thao-moc', 'hoa-cuc'],
      image: demoImages.soap,
    },
    {
      sku: 'DEMO-ROSE-BODY-BUTTER',
      name: 'Bộ dưỡng thể hoa hồng mini',
      description:
        'Hũ bộ dưỡng thể 60ml tặng hoa hồng nhỏ, kết cấu đặc vừa, dùng cho vùng da khô.',
      price: '155000',
      categoryId: categoryIds['soap-cosmetics'],
      sellerId: seller6.id,
      stock: 20,
      lowStockThreshold: 5,
      tags: ['duong-the', 'hoa-hong', 'mini'],
      image: demoImages.soap,
    },
    {
      sku: 'DEMO-SILK-SCRUNCHIE-SET',
      name: 'Bộ dây buộc tóc lụa to 3 màu',
      description:
        'Bộ 3 dây buộc tóc vải lụa mềm, ít hằn tóc, phối màu kem, hồng đất và xanh rêu.',
      price: '120000',
      categoryId: categoryIds['hair-accessories'],
      sellerId: seller4.id,
      stock: 35,
      lowStockThreshold: 8,
      tags: ['day-buoc-toc-vai', 'phu-kien-toc', 'lua'],
      image: demoImages.hair,
    },
    {
      sku: 'DEMO-PEARL-HAIR-CLIP',
      name: 'Kẹp tóc ngọc trai giả đính tay',
      description:
        'Kẹp tóc kim loại đính ngọc trai giả và hạt nhỏ bằng tay, hợp đi tiệc nhẹ hoặc chụp ảnh.',
      price: '98000',
      categoryId: categoryIds['hair-accessories'],
      sellerId: seller4.id,
      stock: 28,
      lowStockThreshold: 6,
      tags: ['kep-toc', 'ngoc-trai', 'dinh-tay'],
      image: demoImages.hair,
    },
    {
      sku: 'DEMO-FLORAL-HEADBAND',
      name: 'Băng đô hoa nhí cotton',
      description:
        'Băng đô cotton họa tiết hoa nhí, may lót mềm, co giãn vừa phải cho sử dụng hằng ngày.',
      price: '89000',
      categoryId: categoryIds['hair-accessories'],
      sellerId: seller4.id,
      stock: 31,
      lowStockThreshold: 7,
      tags: ['bang-do', 'cotton', 'hoa-nhi'],
      image: demoImages.hair,
    },
    {
      sku: 'DEMO-RIBBON-BARRETTE',
      name: 'Kẹp nơ ruy băng lụa bóng',
      description:
        'Kẹp nơ satin dáng dài, may thủ công và cố định bằng kẹp kim loại chắc, tông màu vintage.',
      price: '75000',
      categoryId: categoryIds['hair-accessories'],
      sellerId: seller4.id,
      stock: 42,
      lowStockThreshold: 10,
      tags: ['kep-no', 'satin', 'vintage'],
      image: demoImages.hair,
    },
    {
      sku: 'DEMO-CROCHET-HAIR-TIE',
      name: 'Dây buộc tóc hoa len móc tay',
      description:
        'Dây buộc tóc trang trí hoa len nhỏ móc tay, màu pastel, nhẹ và không kéo tóc.',
      price: '59000',
      categoryId: categoryIds['hair-accessories'],
      sellerId: seller4.id,
      stock: 48,
      lowStockThreshold: 12,
      tags: ['day-buoc-toc', 'crochet', 'hoa-len'],
      image: demoImages.hair,
    },
    {
      sku: 'DEMO-LEATHER-CARD-HOLDER',
      name: 'Bao thẻ da bò khâu tay',
      description:
        'Bao thẻ da bò thật, khâu tay bằng chỉ sáp, có 2 khe thẻ và form mỏng để bỏ túi áo.',
      price: '420000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 16,
      lowStockThreshold: 4,
      tags: ['do-da', 'bao-the', 'khau-tay'],
      image:
        'https://images.pexels.com/photos/10634549/pexels-photo-10634549.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-MINI-WALLET',
      name: 'Ví da mini nắp gập',
      description:
        'Ví da mini nắp gập, khâu tay chắc chắn, đủ đựng tiền mặt và 4-5 thẻ cơ bản.',
      price: '680000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 11,
      lowStockThreshold: 3,
      tags: ['vi-da', 'do-da', 'mini'],
      image:
        'https://images.pexels.com/photos/4452635/pexels-photo-4452635.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-CAMERA-STRAP',
      name: 'Dây máy ảnh da thủ công',
      description:
        'Dây máy ảnh da khâu tay, mặt trong xử lý mềm, có khoen kim loại chắc cho máy ảnh mirrorless.',
      price: '890000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 6,
      lowStockThreshold: 2,
      tags: ['day-may-anh', 'do-da', 'khau-tay'],
      image:
        'https://images.pexels.com/photos/4452393/pexels-photo-4452393.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-KEY-FOB',
      name: 'Móc khóa da khắc chữ cái',
      description:
        'Móc khóa da nhỏ có thể khắc một chữ cái, viền được đánh cạnh và phủ sáp bảo vệ.',
      price: '160000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 24,
      lowStockThreshold: 5,
      tags: ['moc-khoa', 'do-da', 'ca-nhan-hoa'],
      image:
        'https://images.pexels.com/photos/12444593/pexels-photo-12444593.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-NOTEBOOK-COVER',
      name: 'Bìa sổ da thay ruột',
      description:
        'Bìa sổ da thủ công dùng được với ruột A6, có dây buộc và ngăn nhỏ để thẻ.',
      price: '520000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 9,
      lowStockThreshold: 2,
      tags: ['bia-so', 'do-da', 'a6'],
      image:
        'https://images.pexels.com/photos/9744735/pexels-photo-9744735.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-PASSPORT-HOLDER',
      name: 'Bao hộ chiếu da sáp thủ công',
      description:
        'Bao hộ chiếu da sáp khâu tay, có ngăn để passport, vé máy bay và thẻ thành viên khi đi du lịch.',
      price: '560000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 12,
      lowStockThreshold: 3,
      tags: ['do-da', 'bao-ho-chieu', 'du-lich'],
      image:
        'https://images.pexels.com/photos/23371092/pexels-photo-23371092.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-LONG-WALLET',
      name: 'Ví da dài cầm tay',
      description:
        'Ví da dài dạng cầm tay, khâu tay bằng chỉ sáp, có ngăn tiền, ngăn thẻ và ngăn khóa kéo nhỏ.',
      price: '920000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 8,
      lowStockThreshold: 2,
      tags: ['vi-da', 'do-da', 'cam-tay'],
      image:
        'https://images.pexels.com/photos/28027963/pexels-photo-28027963.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-AIRPODS-CASE',
      name: 'Bao AirPods da móc khóa',
      description:
        'Bao AirPods bằng da bò thật, có móc kim loại tiện gắn túi xách hoặc balo, nắp cài chắc chắn.',
      price: '280000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 18,
      lowStockThreshold: 4,
      tags: ['do-da', 'airpods', 'moc-khoa'],
      image:
        'https://images.pexels.com/photos/32267562/pexels-photo-32267562.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-WATCH-STRAP',
      name: 'Dây đồng hồ da nâu cổ điển',
      description:
        'Dây đồng hồ da bò màu nâu vintage, cắt và khâu tay theo size, phù hợp đồng hồ mặt tròn cổ điển.',
      price: '450000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 14,
      lowStockThreshold: 3,
      tags: ['day-dong-ho', 'do-da', 'vintage'],
      image:
        'https://images.pexels.com/photos/11818546/pexels-photo-11818546.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-PEN-SLEEVE',
      name: 'Bao bút da đơn giản',
      description:
        'Bao bút da dạng mỏng cho bút máy hoặc bút ký, viền đánh cạnh và phủ sáp để sử dụng lâu dài.',
      price: '190000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 22,
      lowStockThreshold: 5,
      tags: ['bao-but', 'do-da', 'van-phong'],
      image:
        'https://images.pexels.com/photos/5963170/pexels-photo-5963170.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-COASTER-SET',
      name: 'Bộ lót ly da bò 4 chiếc',
      description:
        'Bộ 4 lót ly bằng da bò thật, bề mặt xử lý chống thấm nhẹ, phù hợp bàn làm việc hoặc bàn trà.',
      price: '240000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 20,
      lowStockThreshold: 5,
      tags: ['lot-ly', 'do-da', 'decor'],
      image:
        'https://images.pexels.com/photos/28028316/pexels-photo-28028316.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-TOTE-HANDLE-WRAP',
      name: 'Bọc quai túi da khâu tay',
      description:
        'Bọc quai túi bằng da mềm, giúp cầm êm tay hơn và tạo điểm nhấn cho túi canvas hoặc tote hằng ngày.',
      price: '210000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 17,
      lowStockThreshold: 4,
      tags: ['phu-kien-tui', 'do-da', 'khau-tay'],
      image:
        'https://images.pexels.com/photos/35685404/pexels-photo-35685404.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-SUNGLASSES-CASE',
      name: 'Bao kính da nắp gập',
      description:
        'Bao kính bằng da bò đẹp form, nắp gập gọn nhẹ, bảo vệ kính râm hoặc kính cận khi mang trong túi.',
      price: '390000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 10,
      lowStockThreshold: 3,
      tags: ['bao-kinh', 'do-da', 'nap-gap'],
      image:
        'https://images.pexels.com/photos/33694193/pexels-photo-33694193.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-DESK-MAT',
      name: 'Tấm lót bàn da thủ công',
      description:
        'Tấm lót bàn da kích thước gọn, bề mặt mịn cho chuột và bàn phím, viền được đánh cạnh bằng tay.',
      price: '780000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 7,
      lowStockThreshold: 2,
      tags: ['lot-ban', 'do-da', 'ban-lam-viec'],
      image:
        'https://images.pexels.com/photos/5963150/pexels-photo-5963150.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-CORD-ORGANIZER',
      name: 'Dây quấn cáp da bấm nút',
      description:
        'Dây quấn cáp sạc bằng da nhỏ gọn, bấm nút kim loại, giúp sắp xếp dây tai nghe và cáp sạc trong túi.',
      price: '85000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 36,
      lowStockThreshold: 8,
      tags: ['quan-cap', 'do-da', 'sap-xep'],
      image:
        'https://images.pexels.com/photos/5963147/pexels-photo-5963147.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-LUGGAGE-TAG',
      name: 'Thẻ hành lý da khắc tên',
      description:
        'Thẻ hành lý da thật có nắp che thông tin, có thể khắc tên hoặc ký hiệu ngắn theo yêu cầu.',
      price: '180000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 26,
      lowStockThreshold: 6,
      tags: ['the-hanh-ly', 'do-da', 'ca-nhan-hoa'],
      image:
        'https://images.pexels.com/photos/11776325/pexels-photo-11776325.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-BELT',
      name: 'Thắt lưng da bò bản nhỏ',
      description:
        'Thắt lưng da bò bản nhỏ, mặt khóa kim loại tối giản, cắt theo size và hoàn thiện cạnh bằng sáp.',
      price: '740000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 9,
      lowStockThreshold: 2,
      tags: ['that-lung', 'do-da', 'toi-gian'],
      image:
        'https://images.pexels.com/photos/27127406/pexels-photo-27127406.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-CLUTCH',
      name: 'Túi clutch da mỏng',
      description:
        'Túi clutch da dạng mỏng, có dây cài tay và ngăn trong đơn giản, phù hợp mang tài liệu nhỏ hoặc vật dụng cá nhân.',
      price: '1050000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 5,
      lowStockThreshold: 2,
      tags: ['tui-da', 'clutch', 'do-da'],
      image:
        'https://images.pexels.com/photos/27137636/pexels-photo-27137636.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-BOOKMARK',
      name: 'Bookmark da dập chữ',
      description:
        'Bookmark da mỏng dập chữ cái, có dây tua nhỏ, món quà gọn cho người thích đọc sách và sổ tay.',
      price: '70000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 40,
      lowStockThreshold: 10,
      tags: ['bookmark', 'do-da', 'qua-tang'],
      image:
        'https://images.pexels.com/photos/4452707/pexels-photo-4452707.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
      sku: 'DEMO-LEATHER-TOOL-ROLL',
      name: 'Túi cuộn đựng dụng cụ da',
      description:
        'Túi cuộn da có nhiều ngăn nhỏ để bút, dao craft hoặc dụng cụ vẽ, có dây cột giữ form chắc chắn.',
      price: '640000',
      categoryId: categoryIds['leather-goods'],
      sellerId: seller3.id,
      stock: 8,
      lowStockThreshold: 2,
      tags: ['tui-cuon', 'do-da', 'dung-cu'],
      image:
        'https://images.pexels.com/photos/5963168/pexels-photo-5963168.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
  ]);

  const realFixtureSummary = await seedRealHandmadeFixture(categoryIds);
  const ceramicHistoryOrdersCount =
    await seedCeramicPurchaseHistoryForUsers(categoryIds.ceramics);
  const ceramicHistoryReviewsCount =
    await seedReviewsForCeramicPurchaseHistory();

  const now = new Date();
  const activeVoucher = await ensureVoucher({
    code: 'HANDMADE10',
    name: 'Mã giảm giá Thủ Công 10%',
    description: 'Mã giảm giá dùng cho demo thanh toán khi nhận hàng.',
    categoryId: categoryIds.ceramics,
    isActive: true,
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    discountPercent: '10',
  });
  await ensureVoucher({
    code: 'EXPIRED5',
    name: 'Voucher hết hạn demo',
    description: 'Dùng để kiểm thử: không thể áp dụng khi đã hết hạn.',
    categoryId: categoryIds.candles,
    isActive: true,
    endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    discountPercent: '5',
  });
  await ensureVoucher({
    code: 'INACTIVE15',
    name: 'Voucher tạm tắt demo',
    description:
      'Dùng để quản trị viên thấy voucher đã tắt và khách hàng không thể áp dụng.',
    categoryId: categoryIds.textiles,
    isActive: false,
    endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
    discountPercent: '15',
  });

  await ensureDemoCart(customer.id, [
    { productId: products.ceramicBowl.id, quantity: 1 },
    { productId: products.crochetKeychain.id, quantity: 2 },
  ]);

  await Promise.all([
    prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: customer.id,
          productId: tote.id,
        },
      },
      update: {},
      create: {
        userId: customer.id,
        productId: tote.id,
      },
    }),
    prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: customer.id,
          productId: products.macrameWallHanging.id,
        },
      },
      update: {},
      create: {
        userId: customer.id,
        productId: products.macrameWallHanging.id,
      },
    }),
    prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: customer2.id,
          productId: expandedProducts['DEMO-LEATHER-MINI-WALLET'].id,
        },
      },
      update: {},
      create: {
        userId: customer2.id,
        productId: expandedProducts['DEMO-LEATHER-MINI-WALLET'].id,
      },
    }),
    prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: customer3.id,
          productId: expandedProducts['DEMO-OAT-HONEY-SOAP'].id,
        },
      },
      update: {},
      create: {
        userId: customer3.id,
        productId: expandedProducts['DEMO-OAT-HONEY-SOAP'].id,
      },
    }),
  ]);

  const deliveredOrder = await ensureDemoOrder({
    checkoutIdempotencyKey: 'seed-demo-delivered-order',
    customerId: customer.id,
    sellerId: seller.id,
    productId: mug.id,
    quantity: 1,
    unitPrice: '180000',
    orderStatus: OrderStatus.DELIVERED,
    subOrderStatus: OrderStatus.DELIVERED,
  });

  const pendingOrder = await ensureDemoOrder({
    checkoutIdempotencyKey: 'seed-demo-pending-order',
    customerId: customer2.id,
    sellerId: seller.id,
    productId: mug.id,
    quantity: 2,
    unitPrice: '180000',
    orderStatus: OrderStatus.PENDING,
    subOrderStatus: OrderStatus.PENDING,
  });

  const processingOrder = await ensureDemoOrder({
    checkoutIdempotencyKey: 'seed-demo-processing-order',
    customerId: customer.id,
    sellerId: seller2.id,
    productId: tote.id,
    quantity: 1,
    unitPrice: '220000',
    orderStatus: OrderStatus.PROCESSING,
    subOrderStatus: OrderStatus.PROCESSING,
  });

  const shippedOrder = await ensureDemoOrder({
    checkoutIdempotencyKey: 'seed-demo-shipped-order',
    customerId: customer2.id,
    sellerId: seller2.id,
    productId: candle.id,
    quantity: 2,
    unitPrice: '150000',
    orderStatus: OrderStatus.SHIPPED,
    subOrderStatus: OrderStatus.SHIPPED,
  });

  const cancelledOrder = await ensureDemoOrder({
    checkoutIdempotencyKey: 'seed-demo-cancelled-order',
    customerId: customer3.id,
    sellerId: seller.id,
    productId: woodTray.id,
    quantity: 1,
    unitPrice: '260000',
    orderStatus: OrderStatus.CANCELLED,
    subOrderStatus: OrderStatus.CANCELLED,
  });

  const secondDeliveredOrder = await ensureDemoOrder({
    checkoutIdempotencyKey: 'seed-demo-delivered-gift-order',
    customerId: customer3.id,
    sellerId: seller2.id,
    productId: products.candleGiftSet.id,
    quantity: 1,
    unitPrice: '290000',
    orderStatus: OrderStatus.DELIVERED,
    subOrderStatus: OrderStatus.DELIVERED,
  });

  const deliveredLeatherOrder = await ensureDemoOrder({
    checkoutIdempotencyKey: 'seed-demo-delivered-leather-order',
    customerId: customer2.id,
    sellerId: seller3.id,
    productId: expandedProducts['DEMO-LEATHER-CARD-HOLDER'].id,
    quantity: 1,
    unitPrice: '420000',
    orderStatus: OrderStatus.DELIVERED,
    subOrderStatus: OrderStatus.DELIVERED,
  });

  const deliveredSoapOrder = await ensureDemoOrder({
    checkoutIdempotencyKey: 'seed-demo-delivered-soap-order',
    customerId: customer.id,
    sellerId: seller6.id,
    productId: expandedProducts['DEMO-LEMONGRASS-SOAP'].id,
    quantity: 2,
    unitPrice: '85000',
    orderStatus: OrderStatus.DELIVERED,
    subOrderStatus: OrderStatus.DELIVERED,
  });

  await ensureDemoOrder({
    checkoutIdempotencyKey: 'seed-demo-processing-crochet-order',
    customerId: customer3.id,
    sellerId: seller4.id,
    productId: expandedProducts['DEMO-CROCHET-TULIP-BOUQUET'].id,
    quantity: 1,
    unitPrice: '320000',
    orderStatus: OrderStatus.PROCESSING,
    subOrderStatus: OrderStatus.PROCESSING,
  });

  const trackingNow = new Date();
  const shippedSubOrder = shippedOrder.subOrders[0];
  const deliveredSubOrder = deliveredOrder.subOrders[0];
  const processingSubOrder = processingOrder.subOrders[0];

  await ensureShipmentTrackingEvent({
    subOrderId: processingSubOrder?.id,
    createdById: seller2.id,
    status: OrderStatus.PROCESSING,
    type: ShipmentTrackingEventType.STATUS_UPDATED,
    title: 'Shop đang chuẩn bị hàng',
    description: 'Sản phẩm đang được kiểm tra và đóng gói trước khi bàn giao vận chuyển.',
    location: 'Kho shop',
    occurredAt: new Date(trackingNow.getTime() - 48 * 60 * 60 * 1000),
  });

  await ensureShipmentTrackingEvent({
    subOrderId: shippedSubOrder?.id,
    createdById: seller2.id,
    status: OrderStatus.PROCESSING,
    type: ShipmentTrackingEventType.STATUS_UPDATED,
    title: 'Đã đóng gói sản phẩm',
    description: 'Kiện hàng đã được đóng gói cẩn thận, sẵn sàng bàn giao cho đơn vị vận chuyển.',
    location: 'Kho shop',
    occurredAt: new Date(trackingNow.getTime() - 36 * 60 * 60 * 1000),
  });

  await ensureShipmentTrackingEvent({
    subOrderId: shippedSubOrder?.id,
    createdById: seller2.id,
    status: OrderStatus.SHIPPED,
    type: ShipmentTrackingEventType.LOCATION,
    title: 'Đã bàn giao cho đơn vị vận chuyển',
    description: 'Kiện hàng đã được bàn giao cho GHN. Khách có thể theo dõi bằng mã vận đơn.',
    location: 'Kho TP. Hồ Chí Minh',
    carrier: 'GHN',
    trackingCode: 'GHN-DEMO-240529',
    occurredAt: new Date(trackingNow.getTime() - 18 * 60 * 60 * 1000),
  });

  await ensureShipmentTrackingEvent({
    subOrderId: deliveredSubOrder?.id,
    createdById: seller.id,
    status: OrderStatus.PROCESSING,
    type: ShipmentTrackingEventType.STATUS_UPDATED,
    title: 'Đã đóng gói sản phẩm',
    description: 'Shop đã đóng gói sản phẩm gốm bằng vật liệu chống sốc.',
    location: 'Kho shop',
    occurredAt: new Date(trackingNow.getTime() - 72 * 60 * 60 * 1000),
  });

  await ensureShipmentTrackingEvent({
    subOrderId: deliveredSubOrder?.id,
    createdById: seller.id,
    status: OrderStatus.SHIPPED,
    type: ShipmentTrackingEventType.LOCATION,
    title: 'Đang giao đến khách',
    description: 'Đơn vị vận chuyển đang giao kiện hàng đến địa chỉ nhận hàng.',
    location: 'Đang giao đến khách',
    carrier: 'GHTK',
    trackingCode: 'GHTK-DEMO-240530',
    occurredAt: new Date(trackingNow.getTime() - 24 * 60 * 60 * 1000),
  });

  await ensureShipmentTrackingEvent({
    subOrderId: deliveredSubOrder?.id,
    createdById: seller.id,
    status: OrderStatus.DELIVERED,
    type: ShipmentTrackingEventType.DELIVERED,
    title: 'Đã giao hàng thành công',
    description: 'Khách hàng đã nhận kiện hàng.',
    location: 'Đã giao thành công',
    carrier: 'GHTK',
    trackingCode: 'GHTK-DEMO-240530',
    occurredAt: new Date(trackingNow.getTime() - 3 * 60 * 60 * 1000),
  });

  const deliveredItem = deliveredOrder.subOrders[0]?.items[0];
  if (deliveredItem) {
    await ensureReviewForOrderItem({
      orderItemId: deliveredItem.id,
      userId: customer.id,
      productId: mug.id,
      rating: 5,
      comment: 'Sản phẩm đẹp, đóng gói cẩn thận và đúng như mô tả.',
      sellerReply: 'Cảm ơn bạn đã ủng hộ Linh Ceramic Studio.',
    });
  }

  const secondDeliveredItem = secondDeliveredOrder.subOrders[0]?.items[0];
  if (secondDeliveredItem) {
    await ensureReviewForOrderItem({
      orderItemId: secondDeliveredItem.id,
      userId: customer3.id,
      productId: products.candleGiftSet.id,
      rating: 4,
      comment: 'Set nến thơm xinh, mùi nhẹ và hộp quà rất chỉn chu.',
      sellerReply: 'Cảm ơn bạn, shop sẽ tiếp tục hoàn thiện mùi hương mới.',
    });
  }

  const deliveredLeatherItem = deliveredLeatherOrder.subOrders[0]?.items[0];
  if (deliveredLeatherItem) {
    await ensureReviewForOrderItem({
      orderItemId: deliveredLeatherItem.id,
      userId: customer2.id,
      productId: expandedProducts['DEMO-LEATHER-CARD-HOLDER'].id,
      rating: 5,
      comment:
        'Đường khâu rất chắc, da thơm nhẹ và màu lên ngoài đời đẹp hơn ảnh.',
      sellerReply:
        'Cảm ơn bạn đã tin Mộc Nhiên Studio, sản phẩm da dùng lâu sẽ lên màu tự nhiên hơn.',
    });
  }

  const deliveredSoapItem = deliveredSoapOrder.subOrders[0]?.items[0];
  if (deliveredSoapItem) {
    await ensureReviewForOrderItem({
      orderItemId: deliveredSoapItem.id,
      userId: customer.id,
      productId: expandedProducts['DEMO-LEMONGRASS-SOAP'].id,
      rating: 4,
      comment:
        'Mùi sả chanh dễ chịu, đóng gói sạch sẽ. Bánh hơi nhỏ nhưng dùng ổn.',
      sellerReply:
        'Cảm ơn bạn, shop sẽ ghi chú rõ trọng lượng hơn trong lô tiếp theo.',
    });
  }

  await ensureProductQuestion({
    productId: mug.id,
    userId: customer2.id,
    answeredById: seller.id,
    question: 'Ly này có dùng được trong lò vi sóng không?',
    answer:
      'Sản phẩm dùng được trong lò vi sóng, nên rửa tay để giữ men lâu hơn.',
  });
  await ensureProductQuestion({
    productId: products.crochetCoaster.id,
    userId: customer.id,
    answeredById: seller2.id,
    question: 'Bộ lót ly có giặt được không?',
    answer: 'Có thể giặt tay nhẹ với nước lạnh và phơi nơi thoáng mát.',
  });
  await ensureProductQuestion({
    productId: expandedProducts['DEMO-CROCHET-TULIP-BOUQUET'].id,
    userId: customer3.id,
    answeredById: seller4.id,
    question: 'Shop có nhận đổi màu hoa tulip theo yêu cầu không?',
    answer:
      'Có bạn nhé, shop có bảng màu len cotton và sẽ xác nhận phối màu trước khi móc.',
  });
  await ensureProductQuestion({
    productId: expandedProducts['DEMO-LAVENDER-SOY-CANDLE'].id,
    userId: customer2.id,
    answeredById: seller6.id,
    question: 'Nến lavender đốt trong phòng ngủ nhỏ có bị nồng không?',
    answer:
      'Mùi lavender của shop ở mức nhẹ, nên đốt 30-45 phút rồi tắt để phòng thơm vừa đủ.',
  });
  await ensureProductQuestion({
    productId: expandedProducts['DEMO-LEATHER-MINI-WALLET'].id,
    userId: customer.id,
    answeredById: seller3.id,
    question: 'Ví mini có khắc tên được không và mất bao lâu?',
    answer:
      'Có thể khắc tối đa 10 ký tự, thời gian hoàn thiện thêm khoảng 1-2 ngày.',
  });
  await ensureProductQuestion({
    productId: expandedProducts['DEMO-PERSONALIZED-GIFT-BOX'].id,
    userId: customer2.id,
    answeredById: seller6.id,
    question: 'Hộp quà có thể viết lời nhắn riêng không?',
    answer:
      'Có, bạn nhập lời nhắn ở ghi chú đơn hàng, shop sẽ viết tay lên thiệp nhỏ.',
  });

  const pendingProductReport = await ensureReport({
    reporterId: customer.id,
    targetProductId: mug.id,
    type: ReportType.PRODUCT,
    reason: 'Báo cáo demo',
    description: 'Báo cáo mẫu để admin có dữ liệu kiểm thử.',
    status: ReportStatus.PENDING,
  });
  const reviewingCustomerReport = await ensureReport({
    reporterId: seller.id,
    targetUserId: customer2.id,
    orderId: pendingOrder.id,
    type: ReportType.CUSTOMER,
    reason: 'Khách yêu cầu đổi địa chỉ nhiều lần',
    description: 'Báo cáo demo để seller gửi admin xem xét hành vi khách hàng.',
    status: ReportStatus.REVIEWING,
  });
  const resolvedShopReport = await ensureReport({
    reporterId: customer3.id,
    targetUserId: seller2.id,
    type: ReportType.SHOP,
    reason: 'Đã xử lý trong demo',
    description:
      'Báo cáo shop đã được admin xử lý để demo trạng thái resolved.',
    status: ReportStatus.RESOLVED,
    resolvedById: admin.id,
    adminNote: 'Đã kiểm tra, chưa phát hiện vi phạm.',
  });

  await ensureChatConversation({
    customerId: customer.id,
    sellerId: seller.id,
    productId: mug.id,
    messages: [
      {
        senderId: customer.id,
        text: 'Shop ơi ly gốm này có thể gói quà được không?',
      },
      {
        senderId: seller.id,
        text: 'Có bạn nhé, shop có hộp giấy kraft và thiệp nhỏ đi kèm.',
      },
    ],
  });

  const quoteTemplate = await ensureQuoteTemplate({
    sellerId: seller.id,
    name: 'Bộ ly gốm cá nhân hóa',
    title: 'Bộ ly gốm khắc tên',
    description:
      'Bộ ly gốm làm thủ công, có thể khắc tên hoặc vẽ ký hiệu nhỏ theo yêu cầu.',
    estimatedPrice: '420000',
    minPrice: '350000',
    maxPrice: '600000',
    estimatedLeadTime: '10-14 ngày',
  });

  const craftingCustomOrder = await ensureCustomOrder({
    customerId: customer.id,
    sellerId: seller.id,
    quoteTemplateId: quoteTemplate.id,
    title: 'Bộ ly gốm khắc tên Minh Anh',
    artisanNote:
      'Shop đã lên phác thảo tông nâu đất, mỗi ly có một ký hiệu nhỏ riêng.',
    price: '420000',
    leadTime: '12 ngày',
    sketchImageUrl: demoImages.ceramic,
    status: CustomOrderStatus.CRAFTING,
  });
  const shippedCustomOrder = await ensureCustomOrder({
    customerId: customer2.id,
    sellerId: seller2.id,
    title: 'Hộp quà nến thơm cưới',
    artisanNote: 'Hộp quà gồm 2 nến thơm, thiệp giấy ép hoa và túi vải linen.',
    price: '520000',
    leadTime: '7 ngày',
    sketchImageUrl: demoImages.candle,
    status: CustomOrderStatus.SHIPPED,
  });

  await ensureCustomOrderProgressEvent({
    customOrderId: craftingCustomOrder.id,
    actorId: seller.id,
    status: CustomOrderStatus.PENDING_REVIEW,
    title: 'Đã gửi bản phác thảo đầu tiên',
    note: 'Shop chọn tông nâu đất và bố cục khắc tên nhỏ để bộ ly giữ cảm giác tối giản.',
    imageUrl: demoImages.ceramic,
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
  });
  await ensureCustomOrderProgressEvent({
    customOrderId: craftingCustomOrder.id,
    actorId: seller.id,
    status: CustomOrderStatus.CRAFTING,
    title: 'Bắt đầu tạo dáng và xử lý bề mặt',
    note: 'Phần thân ly đã được tạo dáng, shop đang hong khô chậm trước khi khắc tên.',
    imageUrl: demoImages.ceramic,
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  });
  await ensureCustomOrderProgressEvent({
    customOrderId: shippedCustomOrder.id,
    actorId: seller2.id,
    status: CustomOrderStatus.CRAFTING,
    title: 'Chuẩn bị nguyên liệu hộp quà',
    note: 'Nến thơm đã đổ khuôn, thiệp ép hoa và túi linen được chuẩn bị theo concept cưới.',
    imageUrl: demoImages.candle,
    createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
  });
  await ensureCustomOrderProgressEvent({
    customOrderId: shippedCustomOrder.id,
    actorId: seller2.id,
    status: CustomOrderStatus.FINISHING,
    title: 'Hoàn thiện đóng gói quà tặng',
    note: 'Shop đã kiểm tra mùi hương, buộc nơ linen và đặt thiệp viết tay trong hộp.',
    imageUrl: demoImages.gift,
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
  });
  await ensureCustomOrderProgressEvent({
    customOrderId: shippedCustomOrder.id,
    actorId: seller2.id,
    status: CustomOrderStatus.SHIPPED,
    title: 'Đã bàn giao đơn cho vận chuyển',
    note: 'Hộp quà đã được chống sốc kỹ và chuyển sang giai đoạn giao hàng.',
    imageUrl: demoImages.gift,
    createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
  });

  await ensureCommissionDemo({
    customerId: customer3.id,
    sellerId: seller2.id,
    title: 'Đặt hộp quà sinh nhật thủ công',
    referenceImage: demoImages.paper,
  });

  await ensureFlashSale({
    name: 'Tuần lễ thủ công địa phương',
    description:
      'Chương trình đang hoạt động để demo quản lý flash sale và giới hạn giảm giá.',
    banner: demoImages.candle,
    startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    endAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    saleState: FlashSaleState.ACTIVE,
    categoryIds: [categoryIds.candles, categoryIds.crochet],
    discountPercent: '12',
  });
  await ensureFlashSale({
    name: 'Flash sale sắp diễn ra',
    description: 'Chương trình sắp diễn ra để quản trị viên kiểm tra trạng thái chờ mở bán.',
    banner: demoImages.decor,
    startAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    endAt: new Date(now.getTime() + 17 * 24 * 60 * 60 * 1000),
    isActive: true,
    saleState: FlashSaleState.ACTIVE,
    categoryIds: [categoryIds['wall-decor']],
    discountPercent: '8',
  });
  await ensureFlashSale({
    name: 'Flash sale đã kết thúc',
    description: 'Chương trình đã kết thúc để quản trị viên có dữ liệu lịch sử.',
    banner: demoImages.paper,
    startAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    endAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    isActive: false,
    saleState: FlashSaleState.ENDED,
    categoryIds: [categoryIds['paper-art']],
    discountPercent: '10',
  });

  await Promise.all([
    ensureNotification({
      userId: admin.id,
      type: NotificationType.PRODUCT_SUBMITTED,
      title: 'Sản phẩm chờ duyệt',
      message: `Sản phẩm "${products.crochetBearPending.name}" đang chờ admin duyệt.`,
      link: '/dashboard/products?status=PENDING',
      metadata: {
        productId: products.crochetBearPending.id,
        sellerId: products.crochetBearPending.sellerId,
      },
      dedupeKey: `seed:notification:admin:${admin.id}:product-pending`,
    }),
    ensureNotification({
      userId: admin.id,
      type: NotificationType.REPORT_CREATED,
      title: 'Có báo cáo mới',
      message: `Báo cáo "${pendingProductReport.reason}" đang chờ xử lý.`,
      link: '/dashboard/reports',
      metadata: {
        reportId: pendingProductReport.id,
        type: pendingProductReport.type,
      },
      dedupeKey: `seed:notification:admin:${admin.id}:report-pending`,
    }),
    ensureNotification({
      userId: seller.id,
      type: NotificationType.ORDER_CREATED,
      title: 'Có đơn hàng mới',
      message: `Shop có kiện hàng mới từ đơn #${pendingOrder.id.slice(0, 8).toUpperCase()}.`,
      link: '/dashboard/orders',
      metadata: {
        orderId: pendingOrder.id,
        subOrderId: pendingOrder.subOrders[0]?.id,
      },
      dedupeKey: `seed:notification:seller:${seller.id}:new-order`,
    }),
    ensureNotification({
      userId: seller.id,
      type: NotificationType.PRODUCT_APPROVED,
      title: 'Sản phẩm đã được duyệt',
      message: `Sản phẩm "${mug.name}" đang hiển thị cho khách hàng.`,
      link: '/dashboard/products',
      metadata: {
        productId: mug.id,
      },
      dedupeKey: `seed:notification:seller:${seller.id}:product-approved`,
      readAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    }),
    ensureNotification({
      userId: seller2.id,
      type: NotificationType.CUSTOM_ORDER_STATUS_UPDATED,
      title: 'Đơn thiết kế riêng đang giao',
      message: `Đơn "${shippedCustomOrder.title}" đang ở trạng thái đang giao.`,
      link: '/seller/custom-orders',
      metadata: {
        customOrderId: shippedCustomOrder.id,
      },
      dedupeKey: `seed:notification:seller:${seller2.id}:custom-order-shipped`,
    }),
    ensureNotification({
      userId: customer.id,
      type: NotificationType.ORDER_STATUS_UPDATED,
      title: 'Đơn hàng đã giao',
      message: `Đơn #${deliveredOrder.id.slice(0, 8).toUpperCase()} đã được giao thành công.`,
      link: `/profile/orders/${deliveredOrder.id}`,
      metadata: {
        orderId: deliveredOrder.id,
      },
      dedupeKey: `seed:notification:customer:${customer.id}:order-delivered`,
    }),
    ensureNotification({
      userId: customer.id,
      type: NotificationType.CUSTOM_QUOTE_SENT,
      title: 'Bạn nhận được báo giá mới',
      message: `Báo giá "${craftingCustomOrder.title}" đã sẵn sàng để xem lại.`,
      link: `/custom-orders/${craftingCustomOrder.id}/review`,
      metadata: {
        customOrderId: craftingCustomOrder.id,
      },
      dedupeKey: `seed:notification:customer:${customer.id}:custom-quote`,
      readAt: new Date(now.getTime() - 90 * 60 * 1000),
    }),
    ensureNotification({
      userId: customer3.id,
      type: NotificationType.REPORT_STATUS_UPDATED,
      title: 'Báo cáo đã được xử lý',
      message: `Báo cáo "${resolvedShopReport.reason}" đã được admin xử lý.`,
      link: null,
      metadata: {
        reportId: resolvedShopReport.id,
      },
      dedupeKey: `seed:notification:customer:${customer3.id}:report-resolved`,
      readAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    }),
    ensureNotification({
      userId: seller.id,
      type: NotificationType.REPORT_CREATED,
      title: 'Báo cáo đang được xem xét',
      message: `Báo cáo "${reviewingCustomerReport.reason}" đang được admin xem xét.`,
      link: '/dashboard/reports',
      metadata: {
        reportId: reviewingCustomerReport.id,
      },
      dedupeKey: `seed:notification:seller:${seller.id}:report-reviewing`,
      readAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    }),
  ]);

  for (const categoryId of Object.values(categoryIds)) {
    const productsCount = await prisma.product.count({
      where: {
        categoryId,
        deletedAt: null,
        status: ProductStatus.APPROVED,
      },
    });
    await prisma.category.update({
      where: { id: categoryId },
      data: { productsCount },
    });
  }

  console.log('Demo seed completed.');
  console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);
  console.log('Admin: admin@ecommerce.com');
  console.log(
    'Seller: seller@ecommerce.com, seller2@ecommerce.com, seller3@ecommerce.com, seller4@ecommerce.com, seller5@ecommerce.com, seller6@ecommerce.com, seller7@ecommerce.com',
  );
  console.log(
    'Customer: customer@ecommerce.com through customer20@ecommerce.com',
  );
  console.log(demoImageSourceNote);
  console.log(
    `Real product fixture: ${realFixtureSummary.productCount} product(s), ${realFixtureSummary.sellerCount} importer seller(s), source ${realFixturePath}`,
  );
  console.log(
    `Ceramic purchase history: ${ceramicHistoryOrdersCount} order(s) for seeded users.`,
  );
  console.log(
    `Ceramic purchase reviews: ${ceramicHistoryReviewsCount} review(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
