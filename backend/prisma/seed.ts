import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import { deflateSync } from 'zlib';
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

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'admin123';
const DEMO_PASSWORD_HASH =
  '$2b$12$X8rFEi2HOdDt90rYjdzVa.NX5PhzFf.zXS.rtoTC2X4TTqV4ld.HK';

const demoImages = {
  ceramic: 'products/demo-ceramic-mug.png',
  linen: 'products/demo-linen-tote.png',
  candle: 'products/demo-soy-candle.png',
  jewelry: 'products/demo-silver-bracelet.png',
  wood: 'products/demo-wooden-tray.png',
  paper: 'products/demo-paper-card.png',
  crochet: 'products/demo-crochet.png',
  decor: 'products/demo-wall-decor.png',
};

type Rgb = [number, number, number];

const demoImagePalettes: Record<
  keyof typeof demoImages,
  { from: Rgb; to: Rgb }
> = {
  ceramic: { from: [121, 85, 72], to: [238, 220, 203] },
  linen: { from: [70, 120, 108], to: [227, 238, 224] },
  candle: { from: [189, 126, 67], to: [255, 233, 196] },
  jewelry: { from: [86, 96, 122], to: [230, 235, 243] },
  wood: { from: [112, 78, 45], to: [226, 190, 142] },
  paper: { from: [155, 86, 107], to: [248, 220, 228] },
  crochet: { from: [105, 96, 68], to: [232, 224, 190] },
  decor: { from: [76, 96, 114], to: [224, 232, 236] },
};

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
};

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type);
  const lengthBuffer = Buffer.alloc(4);
  const crcBuffer = Buffer.alloc(4);

  lengthBuffer.writeUInt32BE(data.length, 0);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function interpolateColor(from: Rgb, to: Rgb, ratio: number): Rgb {
  return [
    Math.round(from[0] + (to[0] - from[0]) * ratio),
    Math.round(from[1] + (to[1] - from[1]) * ratio),
    Math.round(from[2] + (to[2] - from[2]) * ratio),
  ];
}

function createDemoPng(from: Rgb, to: Rgb) {
  const width = 640;
  const height = 800;
  const bytesPerPixel = 3;
  const raw = Buffer.alloc((width * bytesPerPixel + 1) * height);
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0;
    offset += 1;

    for (let x = 0; x < width; x += 1) {
      const ratio =
        (x / Math.max(width - 1, 1)) * 0.35 +
        (y / Math.max(height - 1, 1)) * 0.65;
      const [r, g, b] = interpolateColor(from, to, ratio);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += bytesPerPixel;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function ensureDemoImages() {
  const uploadDir = path.join(process.cwd(), 'uploads', 'products');
  await mkdir(uploadDir, { recursive: true });

  await Promise.all(
    Object.entries(demoImages).map(async ([key, relativePath]) => {
      const fileName = path.basename(relativePath);
      const filePath = path.join(uploadDir, fileName);
      const palette = demoImagePalettes[key as keyof typeof demoImages];
      await writeFile(filePath, createDemoPng(palette.from, palette.to));
    }),
  );
}

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
    const displayName = path.basename(imagePath);

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
      'Khách muốn đặt một món quà handmade cá nhân hóa để tặng sinh nhật.',
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
  await ensureDemoImages();

  await prisma.platformSetting.upsert({
    where: { id: 'platform' },
    update: {
      platformName: 'HandCraft Market',
      platformDescription: 'Marketplace cho sản phẩm handmade',
      commissionBps: 1000,
    },
    create: {
      id: 'platform',
      platformName: 'HandCraft Market',
      platformDescription: 'Marketplace cho sản phẩm handmade',
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
      name: 'Vải và túi handmade',
      slug: 'textiles',
      description: 'Túi vải, phụ kiện và sản phẩm may thủ công.',
      image: demoImages.linen,
    },
    {
      name: 'Nến thơm và quà tặng',
      slug: 'gifts',
      description: 'Quà tặng cá nhân hóa cho những dịp đặc biệt.',
      image: demoImages.candle,
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
      description: 'Tranh, macrame và đồ trang trí làm tay cho không gian sống.',
      image: demoImages.decor,
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
    avatar: demoImages.ceramic,
  });

  const seller2 = await upsertDemoUser({
    email: 'seller2@ecommerce.com',
    name: 'Mai Nguyễn',
    roles: [Role.ROLE_USER, Role.ROLE_SELLER],
    phone: '0901000002',
    shopName: 'Mai Handmade Gifts',
    sellerTitle: 'Nghệ nhân quà tặng',
    sellerBio: 'Quà tặng thủ công, nến thơm và phụ kiện vải cá nhân hóa.',
    sellerAbout:
      'Mai Handmade Gifts tạo nến thơm, đồ vải và quà tặng cá nhân hóa cho các dịp đặc biệt.',
    sellerHeroImage: demoImages.candle,
    sellerAboutImage: demoImages.crochet,
    sellerStat1Label: 'Đơn hoàn thành',
    sellerStat1Value: '80+',
    sellerStat2Label: 'Phong cách',
    sellerStat2Value: 'Quà tặng',
    avatar: demoImages.candle,
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

  await Promise.all([
    ensureDefaultAddress(customer.id),
    ensureDefaultAddress(customer2.id),
    ensureDefaultAddress(customer3.id),
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
  });

  const tote = await upsertProduct({
    sku: 'DEMO-LINEN-TOTE',
    name: 'Túi vải linen thêu tay',
    description:
      'Túi linen có quai dày, thêu họa tiết nhỏ bằng tay. Chất liệu bền và dễ phối đồ.',
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
    name: 'Nến thơm đậu nành hương mộc',
    description:
      'Nến thơm sáp đậu nành trong cốc gốm nhỏ, mùi hương dịu nhẹ cho bàn làm việc và phòng ngủ.',
    price: '150000',
    categoryId: categoryIds.gifts,
    sellerId: seller2.id,
    stock: 30,
    lowStockThreshold: 6,
    tags: ['nen-thom', 'qua-tang'],
    image: demoImages.candle,
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
      'Thiệp handmade ép hoa khô, có phong bì kèm theo, phù hợp sinh nhật và kỷ niệm.',
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
      sellerId: seller.id,
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
      sellerId: seller.id,
      stock: 14,
      lowStockThreshold: 3,
      tags: ['gom-su', 'binh-hoa', 'decor'],
      image: demoImages.ceramic,
    }),
    incenseHolder: await upsertProduct({
      sku: 'DEMO-INCENSE-HOLDER',
      name: 'Đế đốt trầm gốm thủ công',
      description:
        'Đế đốt trầm men mờ, tạo hình thủ công, hợp với góc làm việc hoặc phòng thiền.',
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
        'Bộ 3 nến thơm size mini gồm gỗ tuyết tùng, cam ngọt và trà trắng, đóng hộp quà.',
      price: '290000',
      categoryId: categoryIds.gifts,
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
      sellerId: seller.id,
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
        'Khuyên tai nhẹ, đan sợi thủ công với vòng kim loại chống gỉ, phù hợp phong cách boho.',
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
      name: 'Bộ scrapbook kỷ niệm handmade',
      description:
        'Bộ giấy, sticker và thiệp nhỏ để tự làm scrapbook lưu giữ ảnh và lời nhắn.',
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
      name: 'Móc khóa hoa len crochet',
      description:
        'Móc khóa hoa len nhỏ, móc tay bằng sợi cotton, có thể gắn túi hoặc chìa khóa.',
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

  const now = new Date();
  const activeVoucher = await ensureVoucher({
    code: 'HANDMADE10',
    name: 'Handmade Demo 10%',
    description: 'Voucher local để demo checkout COD.',
    categoryId: categoryIds.ceramics,
    isActive: true,
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    discountPercent: '10',
  });
  await ensureVoucher({
    code: 'EXPIRED5',
    name: 'Voucher hết hạn demo',
    description: 'Dùng để smoke test: không được apply khi đã hết hạn.',
    categoryId: categoryIds.gifts,
    isActive: true,
    endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    discountPercent: '5',
  });
  await ensureVoucher({
    code: 'INACTIVE15',
    name: 'Voucher tạm tắt demo',
    description: 'Dùng để admin thấy voucher inactive và customer không apply được.',
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
    description: 'Báo cáo shop đã được admin xử lý để demo trạng thái resolved.',
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
    artisanNote:
      'Hộp quà gồm 2 nến thơm, thiệp giấy ép hoa và túi vải linen.',
    price: '520000',
    leadTime: '7 ngày',
    sketchImageUrl: demoImages.candle,
    status: CustomOrderStatus.SHIPPED,
  });

  await ensureCommissionDemo({
    customerId: customer3.id,
    sellerId: seller2.id,
    title: 'Đặt hộp quà sinh nhật handmade',
    referenceImage: demoImages.paper,
  });

  await ensureFlashSale({
    name: 'Tuần lễ handmade local',
    description: 'Flash sale active để demo trang admin và discount guardrails.',
    banner: demoImages.candle,
    startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    endAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    saleState: FlashSaleState.ACTIVE,
    categoryIds: [categoryIds.gifts, categoryIds.crochet],
    discountPercent: '12',
  });
  await ensureFlashSale({
    name: 'Flash sale sắp diễn ra',
    description: 'Campaign future để admin thấy trạng thái upcoming.',
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
    description: 'Campaign ended để admin có dữ liệu lịch sử.',
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
  console.log('Seller: seller@ecommerce.com, seller2@ecommerce.com');
  console.log(
    'Customer: customer@ecommerce.com, customer2@ecommerce.com, customer3@ecommerce.com',
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
