import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

interface VoucherVisibilityOptions {
  includeInactive?: boolean;
}

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

    return this.prisma.voucher.create({
      data: {
        name: createVoucherDto.name,
        description: createVoucherDto.description,
        code: createVoucherDto.code,
        categoryId: createVoucherDto.categoryId,
        isActive: createVoucherDto.isActive ?? true,
        endDate: new Date(createVoucherDto.endDate),
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

    if (updateVoucherDto.ranges) {
      this.validateRanges(updateVoucherDto.ranges);
    }

    const { ranges, ...voucherData } = updateVoucherDto;

    return this.prisma.$transaction(async (tx) => {
      await tx.voucherRange.deleteMany({ where: { voucherId: id } });

      const updated = await tx.voucher.update({
        where: { id },
        data: {
          ...voucherData,
          endDate: voucherData.endDate
            ? new Date(voucherData.endDate)
            : undefined,
          ranges: ranges
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
