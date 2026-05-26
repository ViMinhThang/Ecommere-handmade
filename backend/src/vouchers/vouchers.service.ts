import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryStatus, Prisma, Voucher, VoucherRange } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

interface VoucherVisibilityOptions {
  includeInactive?: boolean;
}

type VoucherRangeLike = Pick<
  VoucherRange,
  'minPrice' | 'maxPrice' | 'discountPercent' | 'endDate' | 'deletedAt'
>;

type VoucherUsageReader = Pick<PrismaService, 'voucherUsage'> &
  Partial<Prisma.TransactionClient>;

const VOUCHER_USAGE_LIMIT_EXCEEDED_MESSAGE =
  'Voucher usage limit has been reached';
const VOUCHER_USER_LIMIT_EXCEEDED_MESSAGE =
  'Voucher usage limit has been reached for this user';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  private getPublicVoucherWhere(now = new Date()): Prisma.VoucherWhereInput {
    return {
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
    };
  }

  private getVoucherInclude(includeInactive = false, now = new Date()) {
    return {
      category: true,
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

  async create(createVoucherDto: CreateVoucherDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: createVoucherDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID ${createVoucherDto.categoryId} not found`,
      );
    }

    this.validateRanges(createVoucherDto.ranges);
    this.validateVoucherLimits(createVoucherDto);

    return this.prisma.voucher.create({
      data: {
        name: createVoucherDto.name,
        description: createVoucherDto.description,
        code: createVoucherDto.code,
        categoryId: createVoucherDto.categoryId,
        isActive: createVoucherDto.isActive ?? true,
        endDate: new Date(createVoucherDto.endDate),
        maxDiscountAmount: createVoucherDto.maxDiscountAmount ?? null,
        usageLimit: createVoucherDto.usageLimit ?? null,
        perUserLimit: createVoucherDto.perUserLimit ?? null,
        ranges: {
          create: createVoucherDto.ranges.map((range) => ({
            minPrice: range.minPrice,
            maxPrice: range.maxPrice,
            discountPercent: range.discountPercent,
            endDate: new Date(range.endDate),
          })),
        },
      },
      include: {
        category: true,
        ranges: true,
      },
    });
  }

  async findAll(
    pagination?: PaginationDto,
    options: VoucherVisibilityOptions = {},
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;
    const now = new Date();
    const includeInactive = options.includeInactive ?? false;
    const where = includeInactive
      ? { deletedAt: null }
      : this.getPublicVoucherWhere(now);

    const [data, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        include: this.getVoucherInclude(includeInactive, now),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, options: VoucherVisibilityOptions = {}) {
    const now = new Date();
    const includeInactive = options.includeInactive ?? false;
    const voucher = await this.prisma.voucher.findFirst({
      where: {
        id,
        ...(includeInactive
          ? { deletedAt: null }
          : this.getPublicVoucherWhere(now)),
      },
      include: this.getVoucherInclude(includeInactive, now),
    });
    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }
    return voucher;
  }

  async findByCode(code: string, options: VoucherVisibilityOptions = {}) {
    const now = new Date();
    const includeInactive = options.includeInactive ?? false;
    const voucher = await this.prisma.voucher.findFirst({
      where: {
        code,
        ...(includeInactive
          ? { deletedAt: null }
          : this.getPublicVoucherWhere(now)),
      },
      include: this.getVoucherInclude(includeInactive, now),
    });
    if (!voucher) {
      throw new NotFoundException(`Voucher with code ${code} not found`);
    }
    return voucher;
  }

  async update(id: string, updateVoucherDto: UpdateVoucherDto) {
    const existing = await this.prisma.voucher.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    if (updateVoucherDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateVoucherDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateVoucherDto.categoryId} not found`,
        );
      }
    }

    if (updateVoucherDto.ranges !== undefined) {
      this.validateRanges(updateVoucherDto.ranges);
    }
    this.validateVoucherLimits(updateVoucherDto);

    const { ranges, ...voucherData } = updateVoucherDto;
    const shouldReplaceRanges = ranges !== undefined;

    return this.prisma.$transaction(async (tx) => {
      if (shouldReplaceRanges) {
        await tx.voucherRange.deleteMany({ where: { voucherId: id } });
      }

      const updated = await tx.voucher.update({
        where: { id },
        data: {
          ...voucherData,
          endDate: voucherData.endDate
            ? new Date(voucherData.endDate)
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
          category: true,
          ranges: true,
        },
      });

      return updated;
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.voucher.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }
    return this.prisma.voucher.delete({ where: { id } });
  }

  findMatchingRange<T extends VoucherRangeLike>(
    ranges: T[],
    eligibleSubtotal: number,
    now = new Date(),
  ): T | undefined {
    return ranges.find(
      (range) =>
        !range.deletedAt &&
        new Date(range.endDate) > now &&
        eligibleSubtotal >= Number(range.minPrice) &&
        (range.maxPrice == null || eligibleSubtotal <= Number(range.maxPrice)),
    );
  }

  calculateDiscountAmount(
    voucher: Pick<Voucher, 'maxDiscountAmount'>,
    range: Pick<VoucherRange, 'discountPercent'>,
    eligibleSubtotal: number,
  ) {
    const subtotal = Math.max(0, Math.round(eligibleSubtotal));
    const rawDiscount = Math.round(
      (subtotal * Number(range.discountPercent)) / 100,
    );
    const cappedDiscount =
      voucher.maxDiscountAmount == null
        ? rawDiscount
        : Math.min(rawDiscount, Number(voucher.maxDiscountAmount));

    return Math.max(0, Math.min(cappedDiscount, subtotal));
  }

  async assertVoucherUsageAvailable(
    voucher: Pick<
      Voucher,
      'id' | 'usageLimit' | 'perUserLimit' | 'usedCount'
    >,
    userId: string,
    tx: VoucherUsageReader = this.prisma,
  ) {
    if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) {
      throw new BadRequestException(VOUCHER_USAGE_LIMIT_EXCEEDED_MESSAGE);
    }

    if (voucher.perUserLimit == null) {
      return;
    }

    const userUsageCount = await tx.voucherUsage.count({
      where: {
        voucherId: voucher.id,
        userId,
      },
    });

    if (userUsageCount >= voucher.perUserLimit) {
      throw new BadRequestException(VOUCHER_USER_LIMIT_EXCEEDED_MESSAGE);
    }
  }

  private validateVoucherLimits(dto: {
    maxDiscountAmount?: number | null;
    usageLimit?: number | null;
    perUserLimit?: number | null;
  }) {
    if (
      dto.maxDiscountAmount !== undefined &&
      dto.maxDiscountAmount !== null &&
      dto.maxDiscountAmount < 0
    ) {
      throw new BadRequestException('maxDiscountAmount must be greater than or equal to 0');
    }

    if (
      dto.usageLimit !== undefined &&
      dto.usageLimit !== null &&
      dto.usageLimit <= 0
    ) {
      throw new BadRequestException('usageLimit must be greater than 0');
    }

    if (
      dto.perUserLimit !== undefined &&
      dto.perUserLimit !== null &&
      dto.perUserLimit <= 0
    ) {
      throw new BadRequestException('perUserLimit must be greater than 0');
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
        throw new BadRequestException(`minPrice must be less than maxPrice`);
      }
      if (range.discountPercent < 0 || range.discountPercent > 100) {
        throw new BadRequestException(
          `discountPercent must be between 0 and 100`,
        );
      }
      if (new Date(range.endDate) <= new Date()) {
        throw new BadRequestException(`Range endDate must be in the future`);
      }
    }
  }
}
