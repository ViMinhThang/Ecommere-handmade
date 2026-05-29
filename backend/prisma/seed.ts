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
  '?nh demo dùng URL Unsplash cho local MVP; không hotlink ?nh t? sàn thuong m?i di?n t?, không watermark, không t?o ?nh AI.';

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
    fullName: 'Nguy?n Minh Anh',
    phone: '0900000001',
    address: '12 Ðu?ng Th? Công',
    city: 'H? Chí Minh',
    district: 'Qu?n 1',
    ward: 'B?n Nghé',
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
      price: String(Math.max(0, Math.round(Number(product.priceVnd) || 0))),
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
          fullName: 'Nguy?n Minh Anh',
          phone: '0900000001',
          address: '12 Ðu?ng Th? Công, Qu?n 1, H? Chí Minh',
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
        fullName: 'Nguy?n Minh Anh',
        phone: '0900000001',
        address: '12 Ðu?ng Th? Công, Qu?n 1, H? Chí Minh',
      },
      subOrders: {
        create: [
          {
            sellerId: input.sellerId,
            subTotal: String(subtotal),
            status: input.subOrderStatus,
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
    'Men g?m lên màu r?t d?p, c?m ch?c tay và dóng gói k?.',
    'S?n ph?m dúng ?nh, b? m?t hoàn thi?n m?n và dùng h?ng ngày r?t thích.',
    'Màu men ngoài d?i ?m hon ?nh, shop gói hàng c?n th?n.',
    'Ðu?ng nét th? công có nét riêng, d?t trên bàn r?t xinh.',
    'Giao hàng nhanh, món g?m không s?t m? và ch?t lu?ng t?t.',
    'Ki?u dáng t?i gi?n, phù h?p làm quà t?ng cho ngu?i thích d? handmade.',
    'L?p men d?p, hoi khác nh? gi?a t?ng s?n ph?m nhung r?t có duyên.',
    'S?n ph?m ch?c ch?n, giá h?p lý so v?i d? hoàn thi?n.',
  ];
  const sellerReplies = [
    'C?m on b?n dã ?ng h? shop, chúc b?n dùng s?n ph?m th?t vui.',
    'Shop r?t vui khi s?n ph?m d?n tay b?n an toàn.',
    'C?m on góp ý c?a b?n, shop s? ti?p t?c hoàn thi?n t?ng m? g?m.',
    'C?m on b?n dã yêu thích d? g?m th? công c?a shop.',
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
  const folderName = '?nh demo s?n ph?m';
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
    materials: ['G?m th? công', 'Men an toàn th?c ph?m'],
    sizeOptions: ['B? 2 món', 'B? 4 món'],
    estimatedLeadTime: input.estimatedLeadTime,
    revisionPolicy: 'Bao g?m 1 l?n ch?nh s?a b?n phác th?o.',
    shippingNote: 'Ðóng gói ch?ng s?c tru?c khi giao.',
    termsNote: 'Khách duy?t phác th?o tru?c khi ngu?i bán b?t d?u ch? tác.',
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
    specifications: ['Màu ?m', 'Cá nhân hóa theo tên', 'Ðóng gói quà t?ng'],
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
      'Khách mu?n d?t m?t món quà handmade cá nhân hóa d? t?ng sinh nh?t.',
    budgetMin: '250000',
    budgetMax: '600000',
    desiredTimeline: '2 tu?n',
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
        'Shop có th? làm b?n phác th?o trong 2 ngày và hoàn thi?n trong 10 ngày.',
      proposedPrice: '420000',
      proposedLeadTime: '10 ngày',
      sketchImageUrl: input.referenceImage,
      status: CommissionProposalStatus.PENDING,
    },
    create: {
      commissionId: post.id,
      sellerId: input.sellerId,
      message:
        'Shop có th? làm b?n phác th?o trong 2 ngày và hoàn thi?n trong 10 ngày.',
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
      platformDescription: 'Marketplace cho s?n ph?m handmade',
      commissionBps: 1000,
    },
    create: {
      id: 'platform',
      platformName: 'HandCraft Market',
      platformDescription: 'Marketplace cho s?n ph?m handmade',
      commissionBps: 1000,
    },
  });

  const categories = [
    {
      name: 'G?m s? th? công',
      slug: 'ceramics',
      description: 'Ly, bình và d? trang trí g?m s? làm tay.',
      image: demoImages.ceramic,
    },
    {
      name: 'V?i và túi handmade',
      slug: 'textiles',
      description: 'Túi v?i, ph? ki?n và s?n ph?m may th? công.',
      image: demoImages.linen,
    },
    {
      name: 'Trang s?c th? công',
      slug: 'jewelry',
      description: 'Vòng tay, dây chuy?n và ph? ki?n làm tay.',
      image: demoImages.jewelry,
    },
    {
      name: 'Ð? g? trang trí',
      slug: 'wood-decor',
      description: 'Khay g?, k? nh? và decor nhà c?a.',
      image: demoImages.wood,
    },
    {
      name: 'Thi?p và gi?y ngh? thu?t',
      slug: 'paper-art',
      description: 'Thi?p, scrapbook và s?n ph?m gi?y th? công.',
      image: demoImages.paper,
    },
    {
      name: 'Ð? len và crochet',
      slug: 'crochet',
      description: 'Hoa len, thú bông, lót ly và ph? ki?n móc th? công.',
      image: demoImages.crochet,
    },
    {
      name: 'Tranh và decor th? công',
      slug: 'wall-decor',
      description:
        'Tranh, macrame và d? trang trí làm tay cho không gian s?ng.',
      image: demoImages.decor,
    },
    {
      name: 'N?n thom handmade',
      slug: 'candles',
      description:
        'N?n sáp d?u nành, n?n thom thu giãn và set quà huong li?u làm th? công.',
      image: demoImages.candle,
    },
    {
      name: 'Xà phòng và m? ph?m handmade',
      slug: 'soap-cosmetics',
      description:
        'Xà phòng cold process, son du?ng, mu?i t?m và cham sóc co th? t? nguyên li?u lành tính.',
      image: demoImages.soap,
    },
    {
      name: 'Ph? ki?n tóc handmade',
      slug: 'hair-accessories',
      description:
        'K?p tóc, scrunchie, bang dô và ph? ki?n tóc may ho?c dính th? công.',
      image: demoImages.hair,
    },
    {
      name: 'Ð? da th? công',
      slug: 'leather-goods',
      description:
        'Ví da, móc khóa, bao th? và ph? ki?n da làm tay theo phong cách b?n v?ng.',
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
    name: 'Linh Tr?n',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000001',
    shopName: 'Linh Ceramic Studio',
    sellerTitle: 'Ngh? nhân g?m s?',
    sellerBio: 'G?m s? làm tay v?i men màu ?m và ki?u dáng hi?n d?i.',
    sellerAbout:
      'Linh Ceramic Studio t?p trung vào các s?n ph?m g?m s? dùng h?ng ngày, làm th? công theo t?ng m? nh?.',
    sellerHeroImage: demoImages.ceramic,
    sellerAboutImage: demoImages.wood,
    sellerStat1Label: 'S?n ph?m',
    sellerStat1Value: '12+',
    sellerStat2Label: 'Nam kinh nghi?m',
    sellerStat2Value: '5',
    artisanVerified: true,
    craftSpecialty: 'G?m s? gia d?ng làm tay',
    craftExperienceYears: 5,
    craftMaterials: ['Ð?t sét', 'Men nâu', 'Men tro'],
    verificationNote:
      'Ðã xác minh h? so ngh? nhân và quy trình làm g?m th? công cho demo local.',
    avatar: demoImages.ceramic,
  });

  const seller2 = await upsertDemoUser({
    email: 'seller2@ecommerce.com',
    name: 'Mai Nguy?n',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000002',
    shopName: 'Mai Handmade Gifts',
    sellerTitle: 'Ngh? nhân quà t?ng',
    sellerBio: 'Quà t?ng th? công, n?n thom và ph? ki?n v?i cá nhân hóa.',
    sellerAbout:
      'Mai Handmade Gifts t?o n?n thom, d? v?i và quà t?ng cá nhân hóa cho các d?p d?c bi?t.',
    sellerHeroImage: demoImages.candle,
    sellerAboutImage: demoImages.crochet,
    sellerStat1Label: 'Ðon hoàn thành',
    sellerStat1Value: '80+',
    sellerStat2Label: 'Phong cách',
    sellerStat2Value: 'Quà t?ng',
    artisanVerified: true,
    craftSpecialty: 'Quà t?ng cá nhân hóa và n?n thom',
    craftExperienceYears: 4,
    craftMaterials: ['Sáp d?u nành', 'V?i linen', 'Gi?y kraft'],
    verificationNote:
      'Ðã xác minh studio quà t?ng handmade, phù h?p demo verified artisan.',
    avatar: demoImages.candle,
  });

  const seller3 = await upsertDemoUser({
    email: 'seller3@ecommerce.com',
    name: 'Quang Ph?m',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000003',
    shopName: 'M?c Nhiên Studio',
    sellerTitle: 'Xu?ng g? và da th? công',
    sellerBio:
      'Ð? g? decor, ví da và ph? ki?n bàn làm vi?c du?c hoàn thi?n b?ng tay.',
    sellerAbout:
      'M?c Nhiên Studio uu tiên v?t li?u b?n, b? m?t hoàn thi?n m?c và các chi ti?t s? d?ng lâu dài trong không gian s?ng.',
    sellerHeroImage: demoImages.wood,
    sellerAboutImage: demoImages.leather,
    sellerStat1Label: 'Ðon tùy ch?nh',
    sellerStat1Value: '35+',
    sellerStat2Label: 'Ch?t li?u',
    sellerStat2Value: 'G? & da',
    craftSpecialty: 'Ð? g? decor và ph? ki?n da',
    craftExperienceYears: 6,
    craftMaterials: ['G? cao su', 'Da bò', 'D?u lau g?'],
    avatar: demoImages.wood,
  });

  const seller4 = await upsertDemoUser({
    email: 'seller4@ecommerce.com',
    name: 'Mây Lê',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000004',
    shopName: 'Len Nhà Mây',
    sellerTitle: 'Crochet và d? len cotton',
    sellerBio:
      'Thú bông len, túi crochet, ph? ki?n len m?m và các món quà nh? móc tay.',
    sellerAbout:
      'Len Nhà Mây làm t?ng s?n ph?m b?ng len cotton m?m, uu tiên màu pastel và kích thu?c g?n cho quà t?ng cá nhân.',
    sellerHeroImage: demoImages.crochet,
    sellerAboutImage: demoImages.gift,
    sellerStat1Label: 'M?u len',
    sellerStat1Value: '24+',
    sellerStat2Label: 'Th?i gian',
    sellerStat2Value: '3-7 ngày',
    craftSpecialty: 'Crochet và quà t?ng len',
    craftExperienceYears: 3,
    craftMaterials: ['Len cotton', 'S?i acrylic', 'Ph? ki?n móc khóa'],
    avatar: demoImages.crochet,
  });

  const seller5 = await upsertDemoUser({
    email: 'seller5@ecommerce.com',
    name: 'An Nhiên',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000005',
    shopName: 'G?m An Nhiên',
    sellerTitle: 'G?m th? công men t? nhiên',
    sellerBio:
      'Ly, chén, bình hoa và d? bàn an g?m th? công v?i tông men t? nhiên.',
    sellerAbout:
      'G?m An Nhiên làm theo m? nh?, m?i s?n ph?m có bi?n thiên men nh? nên phù h?p v?i ngu?i thích d? th? công d?c b?n.',
    sellerHeroImage: demoImages.ceramic,
    sellerAboutImage: demoImages.decor,
    sellerStat1Label: 'M? g?m',
    sellerStat1Value: '18+',
    sellerStat2Label: 'Phong cách',
    sellerStat2Value: 'Wabi-sabi',
    craftSpecialty: 'G?m men t? nhiên',
    craftExperienceYears: 7,
    craftMaterials: ['Ð?t sét tr?ng', 'Men t? nhiên', 'Tro th?c v?t'],
    avatar: demoImages.ceramic,
  });

  const seller6 = await upsertDemoUser({
    email: 'seller6@ecommerce.com',
    name: 'Hà Chi',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000006',
    shopName: 'N?n Thom Hoa C?',
    sellerTitle: 'N?n thom và cham sóc co th?',
    sellerBio:
      'N?n sáp d?u nành, xà phòng handmade và set thu giãn t? huong hoa c?.',
    sellerAbout:
      'N?n Thom Hoa C? dùng sáp th?c v?t, tinh d?u d?u nh? và bao bì gi?y tái ch? d? t?o quà t?ng cham sóc b?n thân.',
    sellerHeroImage: demoImages.candle,
    sellerAboutImage: demoImages.soap,
    sellerStat1Label: 'Mùi huong',
    sellerStat1Value: '16+',
    sellerStat2Label: 'Luu huong',
    sellerStat2Value: 'Nh? d?u',
    craftSpecialty: 'N?n thom th?c v?t và xà phòng handmade',
    craftExperienceYears: 4,
    craftMaterials: ['Sáp d?u nành', 'Tinh d?u', 'D?u d?a'],
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
    name: 'B?o Ng?c',
    roles: [Role.ROLE_USER],
    phone: '0902000004',
    avatar: demoImages.gift,
  });

  const customer5 = await upsertDemoUser({
    email: 'customer5@ecommerce.com',
    name: 'Tu?n Khang',
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
      'Ð?c Anh',
      'Ng?c Huy?n',
      'Thanh Tâm',
      'Qu?nh Nhu',
      'Anh Khoa',
      'M? Duyên',
      'H?i Ðang',
      'Tu?ng Vy',
      'Minh Quân',
      'Bích Ng?c',
      'Vi?t An',
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
    name: 'Ly g?m men nâu làm tay',
    description:
      'Ly g?m dung tích 300ml, du?c t?o hình và ph? men th? công. Phù h?p làm quà t?ng ho?c dùng h?ng ngày.',
    price: '180000',
    categoryId: categoryIds.ceramics,
    sellerId: seller.id,
    stock: 24,
    lowStockThreshold: 5,
    tags: ['gom-su', 'qua-tang', 'handmade'],
    image: demoImages.ceramic,
  });

  const tote = await upsertProduct({
    sku: 'DEMO-LINEN-TOTE',
    name: 'Túi v?i linen thêu tay',
    description:
      'Túi linen có quai dày, thêu h?a ti?t nh? b?ng tay. Ch?t li?u b?n và d? ph?i d?.',
    price: '220000',
    categoryId: categoryIds.textiles,
    sellerId: seller2.id,
    stock: 18,
    lowStockThreshold: 4,
    tags: ['vai', 'tui', 'theu-tay'],
    image: demoImages.linen,
  });

  const candle = await upsertProduct({
    sku: 'DEMO-SOY-CANDLE',
    name: 'N?n thom d?u nành huong m?c',
    description:
      'N?n thom sáp d?u nành trong c?c g?m nh?, mùi huong d?u nh? cho bàn làm vi?c và phòng ng?.',
    price: '150000',
    categoryId: categoryIds.candles,
    sellerId: seller2.id,
    stock: 30,
    lowStockThreshold: 6,
    tags: ['nen-thom', 'qua-tang'],
    image: demoImages.candle,
  });

  const bracelet = await upsertProduct({
    sku: 'DEMO-SILVER-BRACELET',
    name: 'Vòng tay b?c dan h?t g?m',
    description:
      'Vòng tay b?c t?i gi?n k?t h?p h?t g?m nh?, có th? di?u ch?nh kích thu?c.',
    price: '320000',
    categoryId: categoryIds.jewelry,
    sellerId: seller.id,
    stock: 12,
    lowStockThreshold: 3,
    tags: ['trang-suc', 'bac', 'gom'],
    image: demoImages.jewelry,
  });

  const woodTray = await upsertProduct({
    sku: 'DEMO-WOODEN-TRAY',
    name: 'Khay g? decor phòng khách',
    description:
      'Khay g? nh? du?c chà nhám và ph? d?u b?o v?, dùng d? decor bàn trà ho?c k? sách.',
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
    name: 'Thi?p gi?y ép hoa khô',
    description:
      'Thi?p handmade ép hoa khô, có phong bì kèm theo, phù h?p sinh nh?t và k? ni?m.',
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
      name: 'Bát g?m men kem v? tay',
      description:
        'Bát g?m nh? ph? men kem, vi?n v? tay, phù h?p dùng cho b?a sáng ho?c decor bàn an.',
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
      name: 'Bình g?m mini c?m hoa khô',
      description:
        'Bình g?m dáng tr? nh?, màu men nâu d?t, dùng c?m hoa khô ho?c trang trí k? sách.',
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
      name: 'Ð? d?t tr?m g?m th? công',
      description:
        'Ð? d?t tr?m men m?, t?o hình th? công, h?p v?i góc làm vi?c ho?c phòng thi?n.',
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
      name: 'Ví v?i thêu hoa lavender',
      description:
        'Ví v?i nh? có khóa kéo, thêu hoa lavender b?ng tay, dùng d?ng m? ph?m ho?c ph? ki?n.',
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
      name: 'Bang dô v?i linen th?t no',
      description:
        'Bang dô linen m?m, may th? công, ph?i du?c v?i trang ph?c t?i gi?n h?ng ngày.',
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
      name: 'Set n?n thom quà t?ng 3 mùi',
      description:
        'B? 3 n?n thom size mini g?m g? tuy?t tùng, cam ng?t và trà tr?ng, dóng h?p quà.',
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
      name: 'Ch?u cây g?m men rêu',
      description:
        'Ch?u cây g?m men rêu kích thu?c nh? cho sen dá, hi?n dùng d? demo tr?ng thái h?t hàng.',
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
      name: 'Dây chuy?n h?t g?m ph?i b?c',
      description:
        'Dây chuy?n h?t g?m nh? ph?i charm b?c, làm th? công theo tông màu trung tính.',
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
      name: 'Khuyên tai dan s?i màu d?t',
      description:
        'Khuyên tai nh?, dan s?i th? công v?i vòng kim lo?i ch?ng g?, phù h?p phong cách boho.',
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
      name: 'Giá d? di?n tho?i g? óc chó',
      description:
        'Giá d? di?n tho?i chà nhám th? công, ph? d?u b?o v?, dùng t?t trên bàn làm vi?c.',
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
      name: 'K? g? mini treo tu?ng',
      description:
        'K? g? mini d? cây nh?, n?n thom ho?c d? suu t?m, hoàn thi?n b?ng d?u t? nhiên.',
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
      name: 'B? scrapbook k? ni?m handmade',
      description:
        'B? gi?y, sticker và thi?p nh? d? t? làm scrapbook luu gi? ?nh và l?i nh?n.',
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
      name: 'Bookmark gi?y dó v? tay',
      description:
        'Bookmark gi?y dó ép hoa, v? tay t?ng chi?c, phù h?p làm quà nh? cho ngu?i thích d?c sách.',
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
        'Móc khóa hoa len nh?, móc tay b?ng s?i cotton, có th? g?n túi ho?c chìa khóa.',
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
      name: 'B? lót ly len móc tay',
      description:
        'B? 4 lót ly crochet màu kem, phù h?p bàn trà ho?c góc làm vi?c.',
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
      name: 'G?u len crochet ch? duy?t',
      description:
        'S?n ph?m demo tr?ng thái ch? duy?t d? admin th?c hi?n approve trong bu?i ch?m.',
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
      name: 'Tranh decor demo b? t? ch?i',
      description:
        'S?n ph?m demo tr?ng thái t? ch?i d? admin/seller ki?m tra UI moderation.',
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
      name: 'Macrame treo tu?ng cotton',
      description:
        'T?m macrame treo tu?ng dan th? công b?ng s?i cotton, t?o di?m nh?n cho phòng ng?.',
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
      name: 'Khung tranh hoa ép th? công',
      description:
        'Khung tranh nh? dùng hoa khô ép th?t, phù h?p trang trí bàn làm vi?c ho?c t?ng b?n bè.',
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
      name: 'Set thi?p cu?i gi?y kraft',
      description:
        'Set thi?p cu?i phong cách m?c v?i gi?y kraft, dây gai và hoa khô trang trí.',
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
      name: 'Vòng tay kh?c tên theo yêu c?u',
      description:
        'Vòng tay dây da ph?i charm kim lo?i, có th? kh?c tên ng?n theo yêu c?u c?a khách.',
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
      name: 'Túi canvas deo chéo thêu lá',
      description:
        'Túi canvas dày, deo chéo ti?n di h?c ho?c di cà phê, m?t tru?c thêu h?a ti?t lá xanh b?ng tay.',
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
      name: 'Ví xu patchwork v?i v?n',
      description:
        'Ví xu nh? ghép t? v?i v?n cotton, có lót trong và khóa kéo ch?c ch?n, phù h?p d?ng tai nghe ho?c ti?n l?.',
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
      name: 'H?p quà cá nhân hóa gi?y kraft',
      description:
        'H?p quà gi?y kraft kèm tag tên, dây gai và hoa khô, có th? ph?i v?i n?n ho?c thi?p theo yêu c?u.',
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
      name: 'Set tag quà mini vi?t tay',
      description:
        'B? 12 tag quà mini b?ng gi?y m? thu?t, vi?n xé tay nh?, thích h?p dùng cho ti?c nh? ho?c gói quà handmade.',
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
      name: 'Móc khóa g? kh?c tên',
      description:
        'Móc khóa g? nh? du?c chà nh?n, kh?c tên ho?c ngày k? ni?m, ph? d?u b?o v? b? m?t.',
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
      name: 'Nh?n resin hoa khô trong su?t',
      description:
        'Nh?n resin d? tay v?i cánh hoa khô nh?, dáng m?nh, h?p phong cách nh? nhàng và t?i gi?n.',
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
      name: 'L?c chân ng?c trai gi? ph?i dá',
      description:
        'L?c chân dây m?nh ph?i ng?c trai gi? và dá nh? màu s?a, có dây n?i di?u ch?nh kích thu?c.',
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
      name: 'Khay g? d? bút và danh thi?p',
      description:
        'Khay g? d? bàn có 3 ngan nh? cho bút, card và k?p gi?y, hoàn thi?n m?c phù h?p góc làm vi?c.',
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
      name: 'B? lót ly g? bo tròn',
      description:
        'B? 4 lót ly g? du?c bo c?nh và ph? d?u th?c v?t, vân g? t? nhiên m?i chi?c hoi khác nhau.',
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
      name: 'S? tay bìa gi?y dó khâu gáy',
      description:
        'S? tay gi?y dó bìa m?m, khâu gáy th? công, gi?y bên trong dày v?a d? vi?t nh?t ký ho?c sketch nh?.',
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
        'Bó 5 bông tulip len cotton, màu pastel, không héo và có th? d?t ph?i màu theo ghi chú.',
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
        'Túi len móc tay dáng mini, quai ng?n, d? d?ng di?n tho?i và ví nh?, nên gi?t tay nh?.',
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
      name: 'Charm th? len móc tay',
      description:
        'Charm th? len kích thu?c nh?, có móc cài kim lo?i, phù h?p g?n balo ho?c làm quà cho tr? nh?.',
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
      name: 'Tranh v?i linen ch? thêu tay',
      description:
        'Banner v?i linen treo tu?ng v?i ch? thêu tay ng?n, tông màu trung tính cho góc h?c t?p ho?c phòng ng?.',
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
      name: 'Tranh poster khung g? th? công',
      description:
        'Tranh poster gi?y m? thu?t kèm khung g? m?nh, phù h?p decor phòng khách ho?c góc d?c sách.',
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
      name: 'N?n thom lavender sáp d?u nành',
      description:
        'N?n 180g huong lavender d?u, sáp d?u nành và tim cotton, th?i gian cháy kho?ng 32-36 gi?.',
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
      name: 'N?n vanilla hu thi?c du l?ch',
      description:
        'N?n hu thi?c 120g mùi vanilla ?m, g?n nh? d? mang di du l?ch ho?c d?t trong phòng làm vi?c.',
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
      name: 'N?n g? dàn huong và h? phách',
      description:
        'N?n thom tông g? 220g, huong dàn huong pha h? phách, phù h?p bu?i t?i thu giãn.',
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
      name: 'Sáp thom hoa nhài d?ng viên',
      description:
        'H?p 8 viên sáp thom hoa nhài, dùng v?i dèn d?t sáp, mùi nh? và không quá ng?t.',
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
      name: 'N?n cam qu? h?p quà nh?',
      description:
        'N?n cam qu? 160g kèm h?p gi?y kraft, h?p làm quà sinh nh?t ho?c quà c?m on.',
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
      name: 'Xà phòng s? chanh quy trình l?nh',
      description:
        'Bánh xà phòng 95g làm theo phuong pháp cold process, huong s? chanh s?ch mát, thích h?p da thu?ng.',
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
      name: 'Xà phòng y?n m?ch m?t ong',
      description:
        'Xà phòng y?n m?ch và m?t ong có h?t scrub m?n, mùi d?u, dùng t?t cho routine t?m thu giãn.',
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
      name: 'Son du?ng cacao handmade',
      description:
        'Son du?ng d?ng th?i v?i bo cacao và d?u h?nh nhân, không màu, phù h?p dùng h?ng ngày.',
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
      name: 'Mu?i t?m th?o m?c hoa cúc',
      description:
        'L? mu?i t?m 250g ph?i hoa cúc khô và tinh d?u d?u nh?, dùng cho ngâm chân ho?c t?m thu giãn.',
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
      name: 'Bo du?ng th? hoa h?ng mini',
      description:
        'Hu bo du?ng th? 60ml tông hoa h?ng nh?, k?t c?u d?c v?a, dùng cho vùng da khô.',
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
      name: 'Set scrunchie l?a to 3 màu',
      description:
        'B? 3 scrunchie may t? v?i l?a m?m, ít h?n tóc, ph?i màu kem, h?ng d?t và xanh rêu.',
      price: '120000',
      categoryId: categoryIds['hair-accessories'],
      sellerId: seller4.id,
      stock: 35,
      lowStockThreshold: 8,
      tags: ['scrunchie', 'phu-kien-toc', 'lua'],
      image: demoImages.hair,
    },
    {
      sku: 'DEMO-PEARL-HAIR-CLIP',
      name: 'K?p tóc ng?c trai gi? dính tay',
      description:
        'K?p tóc kim lo?i dính ng?c trai gi? và h?t nh? b?ng tay, h?p di ti?c nh? ho?c ch?p ?nh.',
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
      name: 'Bang dô hoa nhí cotton',
      description:
        'Bang dô cotton h?a ti?t hoa nhí, may lót m?m, co giãn v?a ph?i cho s? d?ng h?ng ngày.',
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
      name: 'K?p no ruy bang l?a bóng',
      description:
        'K?p no satin dáng dài, may th? công và c? d?nh b?ng k?p kim lo?i ch?c, tông màu vintage.',
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
      name: 'Dây bu?c tóc hoa len móc tay',
      description:
        'Dây bu?c tóc trang trí hoa len nh? móc tay, màu pastel, nh? và không kéo tóc.',
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
      name: 'Bao th? da bò khâu tay',
      description:
        'Bao th? da bò th?t, khâu tay b?ng ch? sáp, có 2 khe th? và form m?ng d? b? túi áo.',
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
      name: 'Ví da mini n?p g?p',
      description:
        'Ví da mini n?p g?p, khâu tay ch?c ch?n, d? d?ng ti?n m?t và 4-5 th? co b?n.',
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
      name: 'Dây máy ?nh da th? công',
      description:
        'Dây máy ?nh da khâu tay, m?t trong x? lý m?m, có khoen kim lo?i ch?c cho máy ?nh mirrorless.',
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
      name: 'Móc khóa da kh?c ch? cái',
      description:
        'Móc khóa da nh? có th? kh?c m?t ch? cái, vi?n du?c dánh c?nh và ph? sáp b?o v?.',
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
      name: 'Bìa s? da thay ru?t',
      description:
        'Bìa s? da handmade dùng du?c v?i ru?t A6, có dây c?t và ngan nh? d? card.',
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
      name: 'Bao h? chi?u da sáp handmade',
      description:
        'Bao h? chi?u da sáp khâu tay, có ngan d? passport, vé máy bay và th? thành viên khi di du l?ch.',
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
      name: 'Ví da dài c?m tay',
      description:
        'Ví da dài d?ng c?m tay, khâu tay b?ng ch? sáp, có ngan ti?n, ngan th? và ngan khóa kéo nh?.',
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
        'Bao AirPods b?ng da bò th?t, có móc kim lo?i ti?n g?n túi xách ho?c balo, n?p cài ch?c ch?n.',
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
      name: 'Dây d?ng h? da nâu c? di?n',
      description:
        'Dây d?ng h? da bò màu nâu vintage, c?t và khâu tay theo size, phù h?p d?ng h? m?t tròn c? di?n.',
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
      name: 'Bao bút da don gi?n',
      description:
        'Bao bút da d?ng m?ng cho bút máy ho?c bút ký, vi?n dánh c?nh và ph? sáp d? s? d?ng lâu dài.',
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
      name: 'B? lót ly da bò 4 chi?c',
      description:
        'B? 4 lót ly b?ng da bò th?t, b? m?t x? lý ch?ng th?m nh?, phù h?p bàn làm vi?c ho?c bàn trà.',
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
      name: 'B?c quai túi da khâu tay',
      description:
        'B?c quai túi b?ng da m?m, giúp c?m êm tay hon và t?o di?m nh?n cho túi canvas ho?c tote h?ng ngày.',
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
      name: 'Bao kính da n?p g?p',
      description:
        'Bao kính b?ng da bò d?p form, n?p g?p g?n nh?, b?o v? kính râm ho?c kính c?n khi mang trong túi.',
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
      name: 'T?m lót bàn da handmade',
      description:
        'T?m lót bàn da kích thu?c g?n, b? m?t m?n cho chu?t và bàn phím, vi?n du?c dánh c?nh b?ng tay.',
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
      name: 'Dây qu?n cáp da b?m nút',
      description:
        'Dây qu?n cáp s?c b?ng da nh? g?n, b?m nút kim lo?i, giúp s?p x?p dây tai nghe và cáp s?c trong túi.',
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
      name: 'Th? hành lý da kh?c tên',
      description:
        'Th? hành lý da th?t có n?p che thông tin, có th? kh?c tên ho?c ký hi?u ng?n theo yêu c?u.',
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
      name: 'Th?t lung da bò b?n nh?',
      description:
        'Th?t lung da bò b?n nh?, m?t khóa kim lo?i t?i gi?n, c?t theo size và hoàn thi?n c?nh b?ng sáp.',
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
      name: 'Túi clutch da m?ng',
      description:
        'Túi clutch da d?ng m?ng, có dây cài tay và ngan trong don gi?n, phù h?p mang tài li?u nh? ho?c v?t d?ng cá nhân.',
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
      name: 'Bookmark da d?p ch?',
      description:
        'Bookmark da m?ng d?p ch? cái, có dây tua nh?, món quà g?n cho ngu?i thích d?c sách và s? tay.',
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
      name: 'Túi cu?n d?ng d?ng c? da',
      description:
        'Túi cu?n da có nhi?u ngan nh? d? bút, dao craft ho?c d?ng c? v?, có dây c?t gi? form ch?c ch?n.',
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
    name: 'Handmade Demo 10%',
    description: 'Voucher local d? demo checkout COD.',
    categoryId: categoryIds.ceramics,
    isActive: true,
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    discountPercent: '10',
  });
  await ensureVoucher({
    code: 'EXPIRED5',
    name: 'Voucher h?t h?n demo',
    description: 'Dùng d? smoke test: không du?c apply khi dã h?t h?n.',
    categoryId: categoryIds.candles,
    isActive: true,
    endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    discountPercent: '5',
  });
  await ensureVoucher({
    code: 'INACTIVE15',
    name: 'Voucher t?m t?t demo',
    description:
      'Dùng d? admin th?y voucher inactive và customer không apply du?c.',
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

  const deliveredItem = deliveredOrder.subOrders[0]?.items[0];
  if (deliveredItem) {
    await ensureReviewForOrderItem({
      orderItemId: deliveredItem.id,
      userId: customer.id,
      productId: mug.id,
      rating: 5,
      comment: 'S?n ph?m d?p, dóng gói c?n th?n và dúng nhu mô t?.',
      sellerReply: 'C?m on b?n dã ?ng h? Linh Ceramic Studio.',
    });
  }

  const secondDeliveredItem = secondDeliveredOrder.subOrders[0]?.items[0];
  if (secondDeliveredItem) {
    await ensureReviewForOrderItem({
      orderItemId: secondDeliveredItem.id,
      userId: customer3.id,
      productId: products.candleGiftSet.id,
      rating: 4,
      comment: 'Set n?n thom xinh, mùi nh? và h?p quà r?t ch?n chu.',
      sellerReply: 'C?m on b?n, shop s? ti?p t?c hoàn thi?n mùi huong m?i.',
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
        'Ðu?ng khâu r?t ch?c, da thom nh? và màu lên ngoài d?i d?p hon ?nh.',
      sellerReply:
        'C?m on b?n dã tin M?c Nhiên Studio, s?n ph?m da dùng lâu s? lên màu t? nhiên hon.',
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
        'Mùi s? chanh d? ch?u, dóng gói s?ch s?. Bánh hoi nh? nhung dùng ?n.',
      sellerReply:
        'C?m on b?n, shop s? ghi chú rõ tr?ng lu?ng hon trong lô ti?p theo.',
    });
  }

  await ensureProductQuestion({
    productId: mug.id,
    userId: customer2.id,
    answeredById: seller.id,
    question: 'Ly này có dùng du?c trong lò vi sóng không?',
    answer:
      'S?n ph?m dùng du?c trong lò vi sóng, nên r?a tay d? gi? men lâu hon.',
  });
  await ensureProductQuestion({
    productId: products.crochetCoaster.id,
    userId: customer.id,
    answeredById: seller2.id,
    question: 'B? lót ly có gi?t du?c không?',
    answer: 'Có th? gi?t tay nh? v?i nu?c l?nh và phoi noi thoáng mát.',
  });
  await ensureProductQuestion({
    productId: expandedProducts['DEMO-CROCHET-TULIP-BOUQUET'].id,
    userId: customer3.id,
    answeredById: seller4.id,
    question: 'Shop có nh?n d?i màu hoa tulip theo yêu c?u không?',
    answer:
      'Có b?n nhé, shop có b?ng màu len cotton và s? xác nh?n ph?i màu tru?c khi móc.',
  });
  await ensureProductQuestion({
    productId: expandedProducts['DEMO-LAVENDER-SOY-CANDLE'].id,
    userId: customer2.id,
    answeredById: seller6.id,
    question: 'N?n lavender d?t trong phòng ng? nh? có b? n?ng không?',
    answer:
      'Mùi lavender c?a shop ? m?c nh?, nên d?t 30-45 phút r?i t?t d? phòng thom v?a d?.',
  });
  await ensureProductQuestion({
    productId: expandedProducts['DEMO-LEATHER-MINI-WALLET'].id,
    userId: customer.id,
    answeredById: seller3.id,
    question: 'Ví mini có kh?c tên du?c không và m?t bao lâu?',
    answer:
      'Có th? kh?c t?i da 10 ký t?, th?i gian hoàn thi?n thêm kho?ng 1-2 ngày.',
  });
  await ensureProductQuestion({
    productId: expandedProducts['DEMO-PERSONALIZED-GIFT-BOX'].id,
    userId: customer2.id,
    answeredById: seller6.id,
    question: 'H?p quà có th? vi?t l?i nh?n riêng không?',
    answer:
      'Có, b?n nh?p l?i nh?n ? ghi chú don hàng, shop s? vi?t tay lên thi?p nh?.',
  });

  const pendingProductReport = await ensureReport({
    reporterId: customer.id,
    targetProductId: mug.id,
    type: ReportType.PRODUCT,
    reason: 'Báo cáo demo',
    description: 'Báo cáo m?u d? admin có d? li?u ki?m th?.',
    status: ReportStatus.PENDING,
  });
  const reviewingCustomerReport = await ensureReport({
    reporterId: seller.id,
    targetUserId: customer2.id,
    orderId: pendingOrder.id,
    type: ReportType.CUSTOMER,
    reason: 'Khách yêu c?u d?i d?a ch? nhi?u l?n',
    description: 'Báo cáo demo d? seller g?i admin xem xét hành vi khách hàng.',
    status: ReportStatus.REVIEWING,
  });
  const resolvedShopReport = await ensureReport({
    reporterId: customer3.id,
    targetUserId: seller2.id,
    type: ReportType.SHOP,
    reason: 'Ðã x? lý trong demo',
    description:
      'Báo cáo shop dã du?c admin x? lý d? demo tr?ng thái resolved.',
    status: ReportStatus.RESOLVED,
    resolvedById: admin.id,
    adminNote: 'Ðã ki?m tra, chua phát hi?n vi ph?m.',
  });

  await ensureChatConversation({
    customerId: customer.id,
    sellerId: seller.id,
    productId: mug.id,
    messages: [
      {
        senderId: customer.id,
        text: 'Shop oi ly g?m này có th? gói quà du?c không?',
      },
      {
        senderId: seller.id,
        text: 'Có b?n nhé, shop có h?p gi?y kraft và thi?p nh? di kèm.',
      },
    ],
  });

  const quoteTemplate = await ensureQuoteTemplate({
    sellerId: seller.id,
    name: 'B? ly g?m cá nhân hóa',
    title: 'B? ly g?m kh?c tên',
    description:
      'B? ly g?m làm th? công, có th? kh?c tên ho?c v? ký hi?u nh? theo yêu c?u.',
    estimatedPrice: '420000',
    minPrice: '350000',
    maxPrice: '600000',
    estimatedLeadTime: '10-14 ngày',
  });

  const craftingCustomOrder = await ensureCustomOrder({
    customerId: customer.id,
    sellerId: seller.id,
    quoteTemplateId: quoteTemplate.id,
    title: 'B? ly g?m kh?c tên Minh Anh',
    artisanNote:
      'Shop dã lên phác th?o tông nâu d?t, m?i ly có m?t ký hi?u nh? riêng.',
    price: '420000',
    leadTime: '12 ngày',
    sketchImageUrl: demoImages.ceramic,
    status: CustomOrderStatus.CRAFTING,
  });
  const shippedCustomOrder = await ensureCustomOrder({
    customerId: customer2.id,
    sellerId: seller2.id,
    title: 'H?p quà n?n thom cu?i',
    artisanNote: 'H?p quà g?m 2 n?n thom, thi?p gi?y ép hoa và túi v?i linen.',
    price: '520000',
    leadTime: '7 ngày',
    sketchImageUrl: demoImages.candle,
    status: CustomOrderStatus.SHIPPED,
  });

  await ensureCustomOrderProgressEvent({
    customOrderId: craftingCustomOrder.id,
    actorId: seller.id,
    status: CustomOrderStatus.PENDING_REVIEW,
    title: 'Ðã g?i b?n phác th?o d?u tiên',
    note: 'Shop ch?n tông nâu d?t và b? c?c kh?c tên nh? d? b? ly gi? c?m giác t?i gi?n.',
    imageUrl: demoImages.ceramic,
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
  });
  await ensureCustomOrderProgressEvent({
    customOrderId: craftingCustomOrder.id,
    actorId: seller.id,
    status: CustomOrderStatus.CRAFTING,
    title: 'B?t d?u t?o dáng và x? lý b? m?t',
    note: 'Ph?n thân ly dã du?c t?o dáng, shop dang hong khô ch?m tru?c khi kh?c tên.',
    imageUrl: demoImages.ceramic,
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  });
  await ensureCustomOrderProgressEvent({
    customOrderId: shippedCustomOrder.id,
    actorId: seller2.id,
    status: CustomOrderStatus.CRAFTING,
    title: 'Chu?n b? nguyên li?u h?p quà',
    note: 'N?n thom dã d? khuôn, thi?p ép hoa và túi linen du?c chu?n b? theo concept cu?i.',
    imageUrl: demoImages.candle,
    createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
  });
  await ensureCustomOrderProgressEvent({
    customOrderId: shippedCustomOrder.id,
    actorId: seller2.id,
    status: CustomOrderStatus.FINISHING,
    title: 'Hoàn thi?n dóng gói quà t?ng',
    note: 'Shop dã ki?m tra mùi huong, bu?c no linen và d?t thi?p vi?t tay trong h?p.',
    imageUrl: demoImages.gift,
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
  });
  await ensureCustomOrderProgressEvent({
    customOrderId: shippedCustomOrder.id,
    actorId: seller2.id,
    status: CustomOrderStatus.SHIPPED,
    title: 'Ðã bàn giao don cho v?n chuy?n',
    note: 'H?p quà dã du?c ch?ng s?c k? và chuy?n sang giai do?n giao hàng.',
    imageUrl: demoImages.gift,
    createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
  });

  await ensureCommissionDemo({
    customerId: customer3.id,
    sellerId: seller2.id,
    title: 'Ð?t h?p quà sinh nh?t handmade',
    referenceImage: demoImages.paper,
  });

  await ensureFlashSale({
    name: 'Tu?n l? handmade local',
    description:
      'Flash sale active d? demo trang admin và discount guardrails.',
    banner: demoImages.candle,
    startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    endAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    saleState: FlashSaleState.ACTIVE,
    categoryIds: [categoryIds.candles, categoryIds.crochet],
    discountPercent: '12',
  });
  await ensureFlashSale({
    name: 'Flash sale s?p di?n ra',
    description: 'Campaign future d? admin th?y tr?ng thái upcoming.',
    banner: demoImages.decor,
    startAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    endAt: new Date(now.getTime() + 17 * 24 * 60 * 60 * 1000),
    isActive: true,
    saleState: FlashSaleState.ACTIVE,
    categoryIds: [categoryIds['wall-decor']],
    discountPercent: '8',
  });
  await ensureFlashSale({
    name: 'Flash sale dã k?t thúc',
    description: 'Campaign ended d? admin có d? li?u l?ch s?.',
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
      title: 'S?n ph?m ch? duy?t',
      message: `S?n ph?m "${products.crochetBearPending.name}" dang ch? admin duy?t.`,
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
      title: 'Có báo cáo m?i',
      message: `Báo cáo "${pendingProductReport.reason}" dang ch? x? lý.`,
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
      title: 'Có don hàng m?i',
      message: `Shop có ki?n hàng m?i t? don #${pendingOrder.id.slice(0, 8).toUpperCase()}.`,
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
      title: 'S?n ph?m dã du?c duy?t',
      message: `S?n ph?m "${mug.name}" dang hi?n th? cho khách hàng.`,
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
      title: 'Ðon thi?t k? riêng dang giao',
      message: `Ðon "${shippedCustomOrder.title}" dang ? tr?ng thái dang giao.`,
      link: '/seller/custom-orders',
      metadata: {
        customOrderId: shippedCustomOrder.id,
      },
      dedupeKey: `seed:notification:seller:${seller2.id}:custom-order-shipped`,
    }),
    ensureNotification({
      userId: customer.id,
      type: NotificationType.ORDER_STATUS_UPDATED,
      title: 'Ðon hàng dã giao',
      message: `Ðon #${deliveredOrder.id.slice(0, 8).toUpperCase()} dã du?c giao thành công.`,
      link: `/profile/orders/${deliveredOrder.id}`,
      metadata: {
        orderId: deliveredOrder.id,
      },
      dedupeKey: `seed:notification:customer:${customer.id}:order-delivered`,
    }),
    ensureNotification({
      userId: customer.id,
      type: NotificationType.CUSTOM_QUOTE_SENT,
      title: 'B?n nh?n du?c báo giá m?i',
      message: `Báo giá "${craftingCustomOrder.title}" dã s?n sàng d? xem l?i.`,
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
      title: 'Báo cáo dã du?c x? lý',
      message: `Báo cáo "${resolvedShopReport.reason}" dã du?c admin x? lý.`,
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
      title: 'Báo cáo dang du?c xem xét',
      message: `Báo cáo "${reviewingCustomerReport.reason}" dang du?c admin xem xét.`,
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
