import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGiftWrapTierDto } from './dto/create-gift-wrap-tier.dto';
import { UpdateGiftWrapTierDto } from './dto/update-gift-wrap-tier.dto';

const publicGiftWrapTierSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  includesCard: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GiftWrapTierSelect;

const adminGiftWrapTierSelect = {
  ...publicGiftWrapTierSelect,
  deletedAt: true,
} satisfies Prisma.GiftWrapTierSelect;

@Injectable()
export class GiftWrapTiersService {
  constructor(private readonly prisma: PrismaService) {}

  findPublic() {
    return this.prisma.giftWrapTier.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: publicGiftWrapTierSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listAdmin() {
    return this.prisma.giftWrapTier.findMany({
      where: { deletedAt: null },
      select: adminGiftWrapTierSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(dto: CreateGiftWrapTierDto) {
    const data = this.normalizeCreateInput(dto);

    return this.prisma.giftWrapTier.create({
      data,
      select: adminGiftWrapTierSelect,
    });
  }

  async update(id: string, dto: UpdateGiftWrapTierDto) {
    await this.assertExists(id);
    const data = this.normalizeUpdateInput(dto);

    return this.prisma.giftWrapTier.update({
      where: { id },
      data,
      select: adminGiftWrapTierSelect,
    });
  }

  async remove(id: string) {
    await this.assertExists(id);

    await this.prisma.giftWrapTier.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { success: true };
  }

  private normalizeCreateInput(
    dto: CreateGiftWrapTierDto,
  ): Prisma.GiftWrapTierUncheckedCreateInput {
    const name = this.cleanText(dto.name);
    if (!name) {
      throw new BadRequestException('Tên mức gói quà là bắt buộc');
    }

    return {
      name,
      description: this.cleanOptionalText(dto.description),
      price: this.normalizePrice(dto.price),
      includesCard: dto.includesCard ?? false,
      sortOrder: this.normalizeSortOrder(dto.sortOrder),
      isActive: dto.isActive ?? true,
    };
  }

  private normalizeUpdateInput(
    dto: UpdateGiftWrapTierDto,
  ): Prisma.GiftWrapTierUncheckedUpdateInput {
    const data: Prisma.GiftWrapTierUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      const name = this.cleanText(dto.name);
      if (!name) {
        throw new BadRequestException('Tên mức gói quà là bắt buộc');
      }
      data.name = name;
    }

    if (dto.description !== undefined) {
      data.description = this.cleanOptionalText(dto.description);
    }

    if (dto.price !== undefined) {
      data.price = this.normalizePrice(dto.price);
    }

    if (dto.includesCard !== undefined) {
      data.includesCard = dto.includesCard;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = this.normalizeSortOrder(dto.sortOrder);
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return data;
  }

  private async assertExists(id: string) {
    const tier = await this.prisma.giftWrapTier.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!tier) {
      throw new NotFoundException('Không tìm thấy mức gói quà');
    }
  }

  private normalizePrice(value: number) {
    const price = Math.floor(Number(value));
    if (!Number.isFinite(price) || price < 0) {
      throw new BadRequestException('Phí gói quà không hợp lệ');
    }

    return price;
  }

  private normalizeSortOrder(value?: number) {
    const sortOrder = Math.floor(Number(value ?? 0));
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      throw new BadRequestException('Thứ tự hiển thị không hợp lệ');
    }

    return sortOrder;
  }

  private cleanOptionalText(value?: string | null) {
    const text = this.cleanText(value);
    return text || null;
  }

  private cleanText(value?: string | null) {
    return typeof value === 'string'
      ? value
          .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim()
      : '';
  }
}
