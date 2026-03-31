import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

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

  async findAll(pagination?: PaginationDto) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.voucher.findMany({
        include: {
          category: true,
          ranges: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voucher.count(),
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

  async findOne(id: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: {
        category: true,
        ranges: true,
      },
    });
    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }
    return voucher;
  }

  async findByCode(code: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
      include: {
        category: true,
        ranges: true,
      },
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
