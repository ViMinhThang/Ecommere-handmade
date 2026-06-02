import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingProfileDto } from './dto/create-shipping-profile.dto';
import { UpdateShippingProfileDto } from './dto/update-shipping-profile.dto';

const shippingProfileSelect = {
  id: true,
  sellerId: true,
  name: true,
  carrierName: true,
  trackingUrlTemplate: true,
  processingMinDays: true,
  processingMaxDays: true,
  transitMinDays: true,
  transitMaxDays: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ShippingProfileSelect;

type NormalizedShippingProfileInput = {
  name?: string;
  carrierName?: string;
  trackingUrlTemplate?: string | null;
  processingMinDays?: number;
  processingMaxDays?: number;
  transitMinDays?: number;
  transitMaxDays?: number;
  isDefault?: boolean;
  isActive?: boolean;
};

@Injectable()
export class ShippingProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(sellerId: string) {
    await this.assertActiveSeller(sellerId);

    return this.prisma.shippingProfile.findMany({
      where: { sellerId, deletedAt: null },
      select: shippingProfileSelect,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(sellerId: string, dto: CreateShippingProfileDto) {
    await this.assertActiveSeller(sellerId);
    const data = this.normalizeInput(dto, true);
    const existingCount = await this.prisma.shippingProfile.count({
      where: { sellerId, deletedAt: null },
    });
    const isActive = data.isActive !== false;
    const shouldBeDefault =
      isActive && (existingCount === 0 || data.isDefault === true);

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.shippingProfile.updateMany({
          where: { sellerId, deletedAt: null },
          data: { isDefault: false },
        });
      }

      return tx.shippingProfile.create({
        data: {
          name: data.name ?? '',
          carrierName: data.carrierName ?? '',
          trackingUrlTemplate: data.trackingUrlTemplate ?? null,
          processingMinDays: data.processingMinDays ?? 1,
          processingMaxDays: data.processingMaxDays ?? 3,
          transitMinDays: data.transitMinDays ?? 2,
          transitMaxDays: data.transitMaxDays ?? 5,
          isActive,
          isDefault: shouldBeDefault,
          sellerId,
        },
        select: shippingProfileSelect,
      });
    });
  }

  async update(sellerId: string, id: string, dto: UpdateShippingProfileDto) {
    const existing = await this.findOwnedProfile(sellerId, id);
    const data = this.normalizeInput(dto, false);
    this.assertDayRanges({
      processingMinDays:
        (data.processingMinDays as number | undefined) ??
        existing.processingMinDays,
      processingMaxDays:
        (data.processingMaxDays as number | undefined) ??
        existing.processingMaxDays,
      transitMinDays:
        (data.transitMinDays as number | undefined) ?? existing.transitMinDays,
      transitMaxDays:
        (data.transitMaxDays as number | undefined) ?? existing.transitMaxDays,
    });
    const shouldSetDefault = data.isDefault === true;

    if (data.isActive === false && shouldSetDefault) {
      throw new BadRequestException('Cannot set an inactive profile as default');
    }
    if (data.isActive === false) {
      data.isDefault = false;
    }

    return this.prisma.$transaction(async (tx) => {
      if (shouldSetDefault) {
        await tx.shippingProfile.updateMany({
          where: { sellerId, deletedAt: null, id: { not: existing.id } },
          data: { isDefault: false },
        });
      }

      const profile = await tx.shippingProfile.update({
        where: { id: existing.id },
        data,
        select: shippingProfileSelect,
      });

      if (!profile.isActive) {
        await tx.product.updateMany({
          where: { sellerId, shippingProfileId: existing.id },
          data: { shippingProfileId: null },
        });
      }

      return profile;
    });
  }

  async setDefault(sellerId: string, id: string) {
    const existing = await this.findOwnedProfile(sellerId, id);

    if (!existing.isActive) {
      throw new BadRequestException('Cannot set an inactive profile as default');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.shippingProfile.updateMany({
        where: { sellerId, deletedAt: null, id: { not: existing.id } },
        data: { isDefault: false },
      });

      return tx.shippingProfile.update({
        where: { id: existing.id },
        data: { isDefault: true },
        select: shippingProfileSelect,
      });
    });
  }

  async remove(sellerId: string, id: string) {
    const existing = await this.findOwnedProfile(sellerId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { sellerId, shippingProfileId: existing.id },
        data: { shippingProfileId: null },
      });

      await tx.shippingProfile.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), isActive: false, isDefault: false },
      });
    });

    return { success: true };
  }

  private async assertActiveSeller(userId: string) {
    const seller = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        roles: { has: Role.ROLE_SELLER },
      },
      select: { id: true },
    });

    if (!seller) {
      throw new ForbiddenException('Only active sellers can manage shipping');
    }
  }

  private async findOwnedProfile(sellerId: string, id: string) {
    await this.assertActiveSeller(sellerId);

    const profile = await this.prisma.shippingProfile.findFirst({
      where: { id, sellerId, deletedAt: null },
    });

    if (!profile) {
      throw new NotFoundException('Shipping profile not found');
    }

    return profile;
  }

  private normalizeInput(
    dto: Partial<CreateShippingProfileDto>,
    requireAll: boolean,
  ): NormalizedShippingProfileInput {
    const data: NormalizedShippingProfileInput = {};

    const name = this.cleanText(dto.name);
    const carrierName = this.cleanText(dto.carrierName);
    const trackingUrlTemplate = this.cleanText(dto.trackingUrlTemplate);

    if (requireAll && !name) {
      throw new BadRequestException('Profile name is required');
    }

    if (requireAll && !carrierName) {
      throw new BadRequestException('Carrier name is required');
    }

    if (dto.name !== undefined) data.name = name;
    if (dto.carrierName !== undefined) data.carrierName = carrierName;
    if (dto.trackingUrlTemplate !== undefined) {
      data.trackingUrlTemplate = trackingUrlTemplate || null;
    }

    for (const field of [
      'processingMinDays',
      'processingMaxDays',
      'transitMinDays',
      'transitMaxDays',
    ] as const) {
      if (dto[field] !== undefined) {
        data[field] = Math.floor(Number(dto[field]));
      }
    }

    const processingMin =
      (data.processingMinDays as number | undefined) ?? dto.processingMinDays;
    const processingMax =
      (data.processingMaxDays as number | undefined) ?? dto.processingMaxDays;
    const transitMin =
      (data.transitMinDays as number | undefined) ?? dto.transitMinDays;
    const transitMax =
      (data.transitMaxDays as number | undefined) ?? dto.transitMaxDays;

    this.assertDayRanges({
      processingMinDays: processingMin,
      processingMaxDays: processingMax,
      transitMinDays: transitMin,
      transitMaxDays: transitMax,
    });

    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return data;
  }

  private cleanText(value?: string | null) {
    return typeof value === 'string'
      ? value
          .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim()
      : '';
  }

  private assertDayRanges(input: {
    processingMinDays?: number;
    processingMaxDays?: number;
    transitMinDays?: number;
    transitMaxDays?: number;
  }) {
    if (
      input.processingMinDays !== undefined &&
      input.processingMaxDays !== undefined &&
      input.processingMinDays > input.processingMaxDays
    ) {
      throw new BadRequestException(
        'processingMinDays must be less than or equal to processingMaxDays',
      );
    }

    if (
      input.transitMinDays !== undefined &&
      input.transitMaxDays !== undefined &&
      input.transitMinDays > input.transitMaxDays
    ) {
      throw new BadRequestException(
        'transitMinDays must be less than or equal to transitMaxDays',
      );
    }
  }
}
