import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import { CreateHomepageBannerDto } from './dto/create-homepage-banner.dto';
import { UpdateHomepageBannerDto } from './dto/update-homepage-banner.dto';
import { CreateHomepageFeaturedProductDto } from './dto/create-homepage-featured-product.dto';
import { UpdateHomepageFeaturedProductDto } from './dto/update-homepage-featured-product.dto';

const HOMEPAGE_PRODUCT_INCLUDE = {
  images: true,
  category: true,
  seller: { select: { id: true, name: true, shopName: true, avatar: true } },
} satisfies Prisma.ProductInclude;

type HomepageProduct = Prisma.ProductGetPayload<{
  include: typeof HOMEPAGE_PRODUCT_INCLUDE;
}>;

@Injectable()
export class HomepageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flashSalesService: FlashSalesService,
  ) {}

  async getPublicHomepage() {
    const now = new Date();

    const [banners, featuredItems] = await Promise.all([
      this.prisma.homepageBanner.findMany({
        where: this.getPublicBannerWhere(now),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.homepageFeaturedProduct.findMany({
        where: {
          isActive: true,
          product: this.getPublicProductWhere(),
        },
        include: {
          product: {
            include: HOMEPAGE_PRODUCT_INCLUDE,
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      banners,
      featuredProducts: await this.enrichProducts(
        featuredItems.map((item) => item.product),
      ),
    };
  }

  listAdminBanners() {
    return this.prisma.homepageBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createBanner(data: CreateHomepageBannerDto) {
    this.assertValidSchedule(data.startAt, data.endAt);

    return this.prisma.homepageBanner.create({
      data: this.mapCreateBannerData(data),
    });
  }

  async updateBanner(id: string, data: UpdateHomepageBannerDto) {
    const existing = await this.assertBannerExists(id);
    this.assertValidSchedule(
      data.startAt !== undefined
        ? data.startAt
        : existing.startAt?.toISOString(),
      data.endAt !== undefined ? data.endAt : existing.endAt?.toISOString(),
    );

    return this.prisma.homepageBanner.update({
      where: { id },
      data: this.mapUpdateBannerData(data),
    });
  }

  async deleteBanner(id: string) {
    await this.assertBannerExists(id);
    await this.prisma.homepageBanner.delete({ where: { id } });

    return { success: true };
  }

  listAdminFeaturedProducts() {
    return this.prisma.homepageFeaturedProduct.findMany({
      include: {
        product: {
          include: HOMEPAGE_PRODUCT_INCLUDE,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createFeaturedProduct(data: CreateHomepageFeaturedProductDto) {
    await this.assertProductExists(data.productId);

    const existing = await this.prisma.homepageFeaturedProduct.findUnique({
      where: { productId: data.productId },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Product is already featured');
    }

    return this.prisma.homepageFeaturedProduct.create({
      data: {
        productId: data.productId,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
      include: {
        product: {
          include: HOMEPAGE_PRODUCT_INCLUDE,
        },
      },
    });
  }

  async updateFeaturedProduct(
    id: string,
    data: UpdateHomepageFeaturedProductDto,
  ) {
    await this.assertFeaturedProductExists(id);

    if (data.productId) {
      await this.assertProductExists(data.productId);
      const duplicate = await this.prisma.homepageFeaturedProduct.findFirst({
        where: {
          productId: data.productId,
          id: { not: id },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new BadRequestException('Product is already featured');
      }
    }

    return this.prisma.homepageFeaturedProduct.update({
      where: { id },
      data,
      include: {
        product: {
          include: HOMEPAGE_PRODUCT_INCLUDE,
        },
      },
    });
  }

  async deleteFeaturedProduct(id: string) {
    await this.assertFeaturedProductExists(id);
    await this.prisma.homepageFeaturedProduct.delete({ where: { id } });

    return { success: true };
  }

  private getPublicBannerWhere(now: Date): Prisma.HomepageBannerWhereInput {
    return {
      isActive: true,
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
    };
  }

  private getPublicProductWhere(): Prisma.ProductWhereInput {
    return {
      deletedAt: null,
      status: ProductStatus.APPROVED,
      category: {
        deletedAt: null,
        status: CategoryStatus.ACTIVE,
      },
    };
  }

  private async enrichProducts(products: HomepageProduct[]) {
    return Promise.all(
      products.map(async (product) => ({
        ...product,
        pricing: await this.flashSalesService.calculateEffectivePrice(
          Number(product.price),
          product.categoryId,
        ),
      })),
    );
  }

  private mapCreateBannerData(
    data: CreateHomepageBannerDto,
  ): Prisma.HomepageBannerUncheckedCreateInput {
    return {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || null,
      imageUrl: data.imageUrl.trim(),
      linkUrl: data.linkUrl?.trim() || null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    };
  }

  private mapUpdateBannerData(
    data: UpdateHomepageBannerDto,
  ): Prisma.HomepageBannerUncheckedUpdateInput {
    const mapped: Prisma.HomepageBannerUncheckedUpdateInput = {};

    if (data.title !== undefined) mapped.title = data.title.trim();
    if (data.subtitle !== undefined) {
      mapped.subtitle = data.subtitle.trim() || null;
    }
    if (data.imageUrl !== undefined) mapped.imageUrl = data.imageUrl.trim();
    if (data.linkUrl !== undefined) {
      mapped.linkUrl = data.linkUrl.trim() || null;
    }
    if (data.sortOrder !== undefined) mapped.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) mapped.isActive = data.isActive;
    if (data.startAt !== undefined) {
      mapped.startAt = data.startAt ? new Date(data.startAt) : null;
    }
    if (data.endAt !== undefined) {
      mapped.endAt = data.endAt ? new Date(data.endAt) : null;
    }

    return mapped;
  }

  private assertValidSchedule(startAt?: string | null, endAt?: string | null) {
    if (!startAt || !endAt) {
      return;
    }

    if (new Date(startAt) > new Date(endAt)) {
      throw new BadRequestException('startAt must be before endAt');
    }
  }

  private async assertBannerExists(id: string) {
    const banner = await this.prisma.homepageBanner.findUnique({
      where: { id },
      select: { id: true, startAt: true, endAt: true },
    });

    if (!banner) {
      throw new NotFoundException('Homepage banner not found');
    }

    return banner;
  }

  private async assertFeaturedProductExists(id: string) {
    const item = await this.prisma.homepageFeaturedProduct.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Homepage featured product not found');
    }
  }

  private async assertProductExists(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!product) {
      throw new BadRequestException('Product does not exist');
    }
  }
}
