import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryStatus, FlashSaleState, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';

interface FlashSaleGuardrailValues {
  maxUnits?: number | null;
  perUserLimit?: number | null;
  reserveStock?: number | null;
  autoPauseThreshold?: number | null;
}

interface FlashSaleVisibilityOptions {
  includeInactive?: boolean;
}

@Injectable()
export class FlashSalesService {
  constructor(private prisma: PrismaService) {}

  private getActiveFlashSaleWhere(
    now = new Date(),
  ): Prisma.FlashSaleWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      saleState: FlashSaleState.ACTIVE,
      startAt: { lte: now },
      endAt: { gte: now },
      categories: {
        some: {
          deletedAt: null,
          category: {
            deletedAt: null,
            status: CategoryStatus.ACTIVE,
          },
        },
      },
      ranges: {
        some: {
          deletedAt: null,
          endDate: { gt: now },
        },
      },
    };
  }

  private getFlashSaleInclude(includeInactive = false, now = new Date()) {
    return {
      categories: includeInactive
        ? { include: { category: true } }
        : {
            where: {
              deletedAt: null,
              category: {
                deletedAt: null,
                status: CategoryStatus.ACTIVE,
              },
            },
            include: { category: true },
          },
      ranges: includeInactive
        ? true
        : {
            where: {
              deletedAt: null,
              endDate: { gt: now },
            },
          },
    };
  }

  async create(createFlashSaleDto: CreateFlashSaleDto) {
    this.validateTimeframe(
      createFlashSaleDto.startAt,
      createFlashSaleDto.endAt,
    );
    this.validateRanges(createFlashSaleDto.ranges);
    this.validateGuardrails(createFlashSaleDto);
    await this.validateNoOverlap(
      createFlashSaleDto.startAt,
      createFlashSaleDto.endAt,
    );

    const categories = await this.prisma.category.findMany({
      where: { id: { in: createFlashSaleDto.categoryIds } },
    });
    if (categories.length !== createFlashSaleDto.categoryIds.length) {
      throw new NotFoundException('One or more categories not found');
    }

    return this.prisma.flashSale.create({
      data: {
        name: createFlashSaleDto.name,
        description: createFlashSaleDto.description,
        banner: createFlashSaleDto.banner,
        startAt: new Date(createFlashSaleDto.startAt),
        endAt: new Date(createFlashSaleDto.endAt),
        isActive: createFlashSaleDto.isActive ?? true,
        saleState: createFlashSaleDto.saleState ?? FlashSaleState.ACTIVE,
        pausedReason: createFlashSaleDto.pausedReason,
        maxUnits: createFlashSaleDto.maxUnits,
        perUserLimit: createFlashSaleDto.perUserLimit,
        reserveStock: createFlashSaleDto.reserveStock,
        autoPauseThreshold: createFlashSaleDto.autoPauseThreshold,
        categories: {
          create: createFlashSaleDto.categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
        ranges: {
          create: createFlashSaleDto.ranges.map((range) => ({
            minPrice: range.minPrice,
            maxPrice: range.maxPrice,
            discountPercent: range.discountPercent,
            endDate: new Date(range.endDate),
          })),
        },
      },
      include: {
        categories: { include: { category: true } },
        ranges: true,
      },
    });
  }

  async findAll(options: FlashSaleVisibilityOptions = {}) {
    const now = new Date();
    const includeInactive = options.includeInactive ?? false;
    return this.prisma.flashSale.findMany({
      where: includeInactive
        ? { deletedAt: null }
        : this.getActiveFlashSaleWhere(now),
      include: this.getFlashSaleInclude(includeInactive, now),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    const now = new Date();
    return this.prisma.flashSale.findMany({
      where: this.getActiveFlashSaleWhere(now),
      include: this.getFlashSaleInclude(false, now),
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveFlashSaleForCategory(categoryId: string) {
    const now = new Date();
    return this.prisma.flashSale.findFirst({
      where: {
        ...this.getActiveFlashSaleWhere(now),
        categories: {
          some: {
            categoryId,
            deletedAt: null,
            category: {
              deletedAt: null,
              status: CategoryStatus.ACTIVE,
            },
          },
        },
      },
      include: {
        ranges: {
          where: {
            deletedAt: null,
            endDate: { gt: now },
          },
        },
      },
    });
  }

  async calculateEffectivePrice(price: number, categoryId: string) {
    const flashSale = await this.getActiveFlashSaleForCategory(categoryId);
    if (!flashSale) {
      return {
        originalPrice: price,
        discountedPrice: price,
        discountPercent: 0,
        flashSaleId: null,
      };
    }

    const matchedRange = flashSale.ranges.find(
      (range) =>
        !range.deletedAt &&
        new Date(range.endDate) > new Date() &&
        price >= Number(range.minPrice) &&
        (range.maxPrice == null || price <= Number(range.maxPrice)),
    );

    if (!matchedRange) {
      return {
        originalPrice: price,
        discountedPrice: price,
        discountPercent: 0,
        flashSaleId: flashSale.id,
      };
    }

    const discountPercent = Number(matchedRange.discountPercent);
    const discountedPrice = Math.round(price * (1 - discountPercent / 100));

    return {
      originalPrice: price,
      discountedPrice,
      discountPercent,
      flashSaleId: flashSale.id,
    };
  }

  async findOne(id: string, options: FlashSaleVisibilityOptions = {}) {
    const now = new Date();
    const includeInactive = options.includeInactive ?? false;
    const flashSale = await this.prisma.flashSale.findFirst({
      where: {
        id,
        ...(includeInactive
          ? { deletedAt: null }
          : this.getActiveFlashSaleWhere(now)),
      },
      include: this.getFlashSaleInclude(includeInactive, now),
    });
    if (!flashSale) {
      throw new NotFoundException(`Flash sale with ID ${id} not found`);
    }
    return flashSale;
  }

  async update(id: string, updateFlashSaleDto: UpdateFlashSaleDto) {
    const existing = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Flash sale with ID ${id} not found`);
    }

    this.validateGuardrails({
      maxUnits: updateFlashSaleDto.maxUnits ?? existing.maxUnits,
      perUserLimit: updateFlashSaleDto.perUserLimit ?? existing.perUserLimit,
      reserveStock: updateFlashSaleDto.reserveStock ?? existing.reserveStock,
      autoPauseThreshold:
        updateFlashSaleDto.autoPauseThreshold ?? existing.autoPauseThreshold,
    });

    if (updateFlashSaleDto.startAt && updateFlashSaleDto.endAt) {
      this.validateTimeframe(
        updateFlashSaleDto.startAt,
        updateFlashSaleDto.endAt,
      );
      await this.validateNoOverlap(
        updateFlashSaleDto.startAt,
        updateFlashSaleDto.endAt,
        id,
      );
    } else if (updateFlashSaleDto.startAt) {
      await this.validateNoOverlap(
        updateFlashSaleDto.startAt,
        existing.endAt.toISOString(),
        id,
      );
    } else if (updateFlashSaleDto.endAt) {
      await this.validateNoOverlap(
        existing.startAt.toISOString(),
        updateFlashSaleDto.endAt,
        id,
      );
    }

    if (updateFlashSaleDto.ranges !== undefined) {
      this.validateRanges(updateFlashSaleDto.ranges);
    }

    if (updateFlashSaleDto.categoryIds !== undefined) {
      const categories = await this.prisma.category.findMany({
        where: { id: { in: updateFlashSaleDto.categoryIds } },
      });
      if (categories.length !== updateFlashSaleDto.categoryIds.length) {
        throw new NotFoundException('One or more categories not found');
      }
    }

    const { categoryIds, ranges, ...flashSaleData } = updateFlashSaleDto;
    const shouldReplaceCategories = categoryIds !== undefined;
    const shouldReplaceRanges = ranges !== undefined;

    return this.prisma.$transaction(async (tx) => {
      if (shouldReplaceCategories) {
        await tx.flashSaleCategory.deleteMany({ where: { flashSaleId: id } });
      }
      if (shouldReplaceRanges) {
        await tx.flashSaleRange.deleteMany({ where: { flashSaleId: id } });
      }

      const updated = await tx.flashSale.update({
        where: { id },
        data: {
          ...flashSaleData,
          startAt: flashSaleData.startAt
            ? new Date(flashSaleData.startAt)
            : undefined,
          endAt: flashSaleData.endAt
            ? new Date(flashSaleData.endAt)
            : undefined,
          categories: shouldReplaceCategories
            ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
            : undefined,
          ranges: shouldReplaceRanges
            ? {
                create: ranges.map((range) => ({
                  minPrice: range.minPrice,
                  maxPrice: range.maxPrice,
                  discountPercent: range.discountPercent,
                  endDate: new Date(range.endDate),
                })),
              }
            : undefined,
        },
        include: {
          categories: { include: { category: true } },
          ranges: true,
        },
      });

      return updated;
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Flash sale with ID ${id} not found`);
    }
    return this.prisma.flashSale.delete({ where: { id } });
  }

  private validateTimeframe(startAt: string, endAt: string) {
    if (new Date(startAt) >= new Date(endAt)) {
      throw new BadRequestException('startAt must be before endAt');
    }
  }

  private async validateNoOverlap(
    startAt: string,
    endAt: string,
    excludeId?: string,
  ) {
    const where: {
      deletedAt: null;
      OR: { startAt: { lte: Date }; endAt: { gte: Date } }[];
      id?: { not: string };
    } = {
      deletedAt: null,
      OR: [
        {
          startAt: { lte: new Date(endAt) },
          endAt: { gte: new Date(startAt) },
        },
      ],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const overlapping = await this.prisma.flashSale.findMany({ where });

    if (overlapping.length > 0) {
      const conflict = overlapping[0];
      throw new BadRequestException(
        `Flash sale "${conflict.name}" already occupies the timeframe ${conflict.startAt.toLocaleDateString()} - ${conflict.endAt.toLocaleDateString()}. Only one flash sale can be active at a time.`,
      );
    }
  }

  private validateRanges(
    ranges: {
      minPrice: number;
      maxPrice: number;
      discountPercent: number;
      endDate: string;
    }[],
  ) {
    for (const range of ranges) {
      if (range.minPrice >= range.maxPrice) {
        throw new BadRequestException('minPrice must be less than maxPrice');
      }
      if (range.discountPercent < 0 || range.discountPercent > 100) {
        throw new BadRequestException(
          'discountPercent must be between 0 and 100',
        );
      }
    }
  }

  private validateGuardrails(values: FlashSaleGuardrailValues) {
    this.validateOptionalInteger(values.maxUnits, 'maxUnits', 1);
    this.validateOptionalInteger(values.perUserLimit, 'perUserLimit', 1);
    this.validateOptionalInteger(values.reserveStock, 'reserveStock', 0);
    this.validateOptionalInteger(
      values.autoPauseThreshold,
      'autoPauseThreshold',
      0,
    );

    if (
      values.maxUnits != null &&
      values.perUserLimit != null &&
      values.perUserLimit > values.maxUnits
    ) {
      throw new BadRequestException(
        'perUserLimit must be less than or equal to maxUnits',
      );
    }

    if (
      values.maxUnits != null &&
      values.autoPauseThreshold != null &&
      values.autoPauseThreshold > values.maxUnits
    ) {
      throw new BadRequestException(
        'autoPauseThreshold must be less than or equal to maxUnits',
      );
    }
  }

  private validateOptionalInteger(
    value: number | null | undefined,
    fieldName: string,
    minimum: number,
  ) {
    if (value == null) {
      return;
    }

    if (!Number.isInteger(value)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    if (value < minimum) {
      throw new BadRequestException(
        `${fieldName} must be greater than or equal to ${minimum}`,
      );
    }
  }
}
