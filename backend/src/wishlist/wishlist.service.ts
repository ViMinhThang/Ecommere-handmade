import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import { PrismaService } from '../prisma/prisma.service';

const WISHLIST_PRODUCT_INCLUDE = {
  images: true,
  category: { select: { id: true, name: true, slug: true } },
  seller: {
    select: {
      id: true,
      name: true,
      shopName: true,
      avatar: true,
    },
  },
} satisfies Prisma.ProductInclude;

type WishlistItemWithProduct = Prisma.WishlistItemGetPayload<{
  include: {
    product: {
      include: typeof WISHLIST_PRODUCT_INCLUDE;
    };
  };
}>;

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flashSalesService: FlashSalesService,
  ) {}

  async list(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: {
        userId,
        product: {
          deletedAt: null,
          status: ProductStatus.APPROVED,
        },
      },
      include: {
        product: {
          include: WISHLIST_PRODUCT_INCLUDE,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(items.map((item) => this.enrichItem(item)));
  }

  async getProductStatus(userId: string, productId: string) {
    const count = await this.prisma.wishlistItem.count({
      where: {
        userId,
        productId,
        product: {
          deletedAt: null,
          status: ProductStatus.APPROVED,
        },
      },
    });

    return {
      productId,
      isWishlisted: count > 0,
    };
  }

  async add(userId: string, productId: string) {
    await this.assertProductAvailable(productId);

    const existingItem = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      include: {
        product: {
          include: WISHLIST_PRODUCT_INCLUDE,
        },
      },
    });

    if (existingItem) {
      return this.enrichItem(existingItem);
    }

    const item = await this.prisma.wishlistItem.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: WISHLIST_PRODUCT_INCLUDE,
        },
      },
    });

    return this.enrichItem(item);
  }

  async remove(userId: string, productId: string) {
    await this.prisma.wishlistItem.deleteMany({
      where: {
        userId,
        productId,
      },
    });

    return {
      productId,
      isWishlisted: false,
    };
  }

  private async assertProductAvailable(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        status: ProductStatus.APPROVED,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm để yêu thích');
    }
  }

  private async enrichItem(item: WishlistItemWithProduct) {
    const pricing = await this.flashSalesService.calculateEffectivePrice(
      Number(item.product.price),
      item.product.categoryId,
    );

    return {
      ...item,
      product: {
        ...item.product,
        pricing,
      },
    };
  }
}
