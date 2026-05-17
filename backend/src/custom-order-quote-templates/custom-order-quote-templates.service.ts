import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomOrderQuoteTemplateDto } from './dto/create-custom-order-quote-template.dto';
import { UpdateCustomOrderQuoteTemplateDto } from './dto/update-custom-order-quote-template.dto';

const MAX_STRUCTURED_JSON_LENGTH = 10_000;

@Injectable()
export class CustomOrderQuoteTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(sellerId: string) {
    return this.prisma.customOrderQuoteTemplate.findMany({
      where: {
        sellerId,
        deletedAt: null,
      },
      select: this.templateSelect,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(sellerId: string, dto: CreateCustomOrderQuoteTemplateDto) {
    const data = this.normalizeCreateDto(dto);

    return this.prisma.customOrderQuoteTemplate.create({
      data: {
        sellerId,
        ...data,
      },
      select: this.templateSelect,
    });
  }

  async findOne(id: string, sellerId: string) {
    return this.getOwnedTemplate(id, sellerId);
  }

  async update(
    id: string,
    sellerId: string,
    dto: UpdateCustomOrderQuoteTemplateDto,
  ) {
    const existing = await this.getOwnedTemplate(id, sellerId);
    const data = this.normalizeUpdateDto(dto, existing);

    return this.prisma.customOrderQuoteTemplate.update({
      where: { id },
      data,
      select: this.templateSelect,
    });
  }

  async remove(id: string, sellerId: string) {
    await this.getOwnedTemplate(id, sellerId);

    return this.prisma.customOrderQuoteTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: this.templateSelect,
    });
  }

  private async getOwnedTemplate(id: string, sellerId: string) {
    const template = await this.prisma.customOrderQuoteTemplate.findFirst({
      where: {
        id,
        sellerId,
        deletedAt: null,
      },
      select: this.templateSelect,
    });

    if (!template) {
      throw new NotFoundException('Quote template not found');
    }

    return template;
  }

  private normalizeCreateDto(dto: CreateCustomOrderQuoteTemplateDto) {
    const name = this.trimRequired(dto.name, 'Template name is required');
    const title = this.trimRequired(dto.title, 'Quote title is required');
    this.assertValidPriceRange(dto.minPrice, dto.maxPrice);

    return {
      name,
      title,
      description: this.trimOptional(dto.description) ?? '',
      estimatedPrice: dto.estimatedPrice,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
      materials: this.normalizeStructuredValue(dto.materials, [], 'materials'),
      sizeOptions: this.normalizeStructuredValue(
        dto.sizeOptions,
        [],
        'sizeOptions',
      ),
      estimatedLeadTime: this.trimOptional(dto.estimatedLeadTime),
      revisionPolicy: this.trimOptional(dto.revisionPolicy),
      shippingNote: this.trimOptional(dto.shippingNote),
      termsNote: this.trimOptional(dto.termsNote),
      isActive: dto.isActive ?? true,
    };
  }

  private normalizeUpdateDto(
    dto: UpdateCustomOrderQuoteTemplateDto,
    existing: {
      minPrice: Prisma.Decimal | null;
      maxPrice: Prisma.Decimal | null;
    },
  ): Prisma.CustomOrderQuoteTemplateUpdateInput {
    const nextMinPrice =
      dto.minPrice !== undefined
        ? dto.minPrice
        : this.decimalToNumber(existing.minPrice);
    const nextMaxPrice =
      dto.maxPrice !== undefined
        ? dto.maxPrice
        : this.decimalToNumber(existing.maxPrice);
    this.assertValidPriceRange(nextMinPrice, nextMaxPrice);

    const data: Prisma.CustomOrderQuoteTemplateUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = this.trimRequired(dto.name, 'Template name is required');
    }
    if (dto.title !== undefined) {
      data.title = this.trimRequired(dto.title, 'Quote title is required');
    }
    if (dto.description !== undefined) {
      data.description = this.trimOptional(dto.description) ?? '';
    }
    if (dto.estimatedPrice !== undefined) {
      data.estimatedPrice = dto.estimatedPrice;
    }
    if (dto.minPrice !== undefined) {
      data.minPrice = dto.minPrice;
    }
    if (dto.maxPrice !== undefined) {
      data.maxPrice = dto.maxPrice;
    }
    if (dto.materials !== undefined) {
      data.materials = this.normalizeStructuredValue(
        dto.materials,
        [],
        'materials',
      );
    }
    if (dto.sizeOptions !== undefined) {
      data.sizeOptions = this.normalizeStructuredValue(
        dto.sizeOptions,
        [],
        'sizeOptions',
      );
    }
    if (dto.estimatedLeadTime !== undefined) {
      data.estimatedLeadTime = this.trimOptional(dto.estimatedLeadTime);
    }
    if (dto.revisionPolicy !== undefined) {
      data.revisionPolicy = this.trimOptional(dto.revisionPolicy);
    }
    if (dto.shippingNote !== undefined) {
      data.shippingNote = this.trimOptional(dto.shippingNote);
    }
    if (dto.termsNote !== undefined) {
      data.termsNote = this.trimOptional(dto.termsNote);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return data;
  }

  private trimRequired(value: string, message: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(message);
    }
    return trimmed;
  }

  private trimOptional(value?: string) {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private assertValidPriceRange(
    minPrice?: number | null,
    maxPrice?: number | null,
  ) {
    if (
      minPrice !== undefined &&
      minPrice !== null &&
      maxPrice !== undefined &&
      maxPrice !== null &&
      minPrice > maxPrice
    ) {
      throw new BadRequestException(
        'minPrice must be less than or equal to maxPrice',
      );
    }
  }

  private normalizeStructuredValue(
    value: unknown,
    fallback: Prisma.InputJsonValue,
    fieldName: string,
  ): Prisma.InputJsonValue {
    if (value === undefined) {
      return fallback;
    }

    if (!Array.isArray(value) && !this.isPlainObject(value)) {
      throw new BadRequestException(`${fieldName} must be an array or object`);
    }

    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > MAX_STRUCTURED_JSON_LENGTH) {
      throw new BadRequestException(`${fieldName} is too large`);
    }

    return value as Prisma.InputJsonValue;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private decimalToNumber(value: Prisma.Decimal | null) {
    return value === null ? null : Number(value);
  }

  private readonly templateSelect = {
    id: true,
    sellerId: true,
    name: true,
    title: true,
    description: true,
    estimatedPrice: true,
    minPrice: true,
    maxPrice: true,
    materials: true,
    sizeOptions: true,
    estimatedLeadTime: true,
    revisionPolicy: true,
    shippingNote: true,
    termsNote: true,
    isActive: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}
