import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomOrderQuoteTemplatesService } from './custom-order-quote-templates.service';

describe('CustomOrderQuoteTemplatesService', () => {
  let prisma: {
    customOrderQuoteTemplate: Record<string, jest.Mock>;
  };
  let service: CustomOrderQuoteTemplatesService;

  const template = {
    id: 'template-1',
    sellerId: 'seller-1',
    name: 'Standard vase',
    title: 'Custom ceramic vase',
    description: 'Hand-thrown vase quote',
    estimatedPrice: 100000,
    minPrice: 80000,
    maxPrice: 120000,
    materials: ['clay', 'glaze'],
    sizeOptions: { height: '20cm' },
    estimatedLeadTime: '2 weeks',
    revisionPolicy: 'One revision included',
    shippingNote: 'Ships after curing',
    termsNote: 'Final color may vary',
    isActive: true,
    deletedAt: null,
    createdAt: new Date('2026-05-17T00:00:00.000Z'),
    updatedAt: new Date('2026-05-17T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      customOrderQuoteTemplate: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new CustomOrderQuoteTemplatesService(prisma as never);
  });

  it('lists only non-deleted templates owned by the seller', async () => {
    prisma.customOrderQuoteTemplate.findMany.mockResolvedValue([template]);

    const result = await service.findAll('seller-1');

    expect(prisma.customOrderQuoteTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sellerId: 'seller-1',
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    );
    expect(result).toEqual([template]);
  });

  it('creates a seller-owned template with trimmed fields and safe defaults', async () => {
    prisma.customOrderQuoteTemplate.create.mockResolvedValue(template);

    await service.create('seller-1', {
      name: '  Standard vase  ',
      title: '  Custom ceramic vase  ',
      description: '  Hand-thrown vase quote  ',
      estimatedPrice: 100000,
      minPrice: 80000,
      maxPrice: 120000,
      materials: ['clay', 'glaze'],
      sizeOptions: { height: '20cm' },
      estimatedLeadTime: '  2 weeks  ',
    });

    expect(prisma.customOrderQuoteTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sellerId: 'seller-1',
          name: 'Standard vase',
          title: 'Custom ceramic vase',
          description: 'Hand-thrown vase quote',
          materials: ['clay', 'glaze'],
          sizeOptions: { height: '20cm' },
          estimatedLeadTime: '2 weeks',
          isActive: true,
        }),
      }),
    );
  });

  it('rejects inverted price ranges', async () => {
    await expect(
      service.create('seller-1', {
        name: 'Range test',
        title: 'Range quote',
        minPrice: 200000,
        maxPrice: 100000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-object structured materials', async () => {
    await expect(
      service.create('seller-1', {
        name: 'Bad materials',
        title: 'Bad quote',
        materials: 'clay',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not expose or update templates owned by another seller', async () => {
    prisma.customOrderQuoteTemplate.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('template-1', 'seller-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects partial updates that would invert an existing range', async () => {
    prisma.customOrderQuoteTemplate.findFirst.mockResolvedValue({
      ...template,
      minPrice: 80000,
      maxPrice: 120000,
    });

    await expect(
      service.update('template-1', 'seller-1', {
        minPrice: 150000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates only the seller owned template', async () => {
    prisma.customOrderQuoteTemplate.findFirst.mockResolvedValue(template);
    prisma.customOrderQuoteTemplate.update.mockResolvedValue({
      ...template,
      name: 'Updated vase',
    });

    await service.update('template-1', 'seller-1', {
      name: '  Updated vase  ',
      sizeOptions: ['small', 'medium'],
    });

    expect(prisma.customOrderQuoteTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'template-1',
          sellerId: 'seller-1',
          deletedAt: null,
        },
      }),
    );
    expect(prisma.customOrderQuoteTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'template-1' },
        data: {
          name: 'Updated vase',
          sizeOptions: ['small', 'medium'],
        },
      }),
    );
  });

  it('soft deletes a seller owned template', async () => {
    prisma.customOrderQuoteTemplate.findFirst.mockResolvedValue(template);
    prisma.customOrderQuoteTemplate.update.mockResolvedValue({
      ...template,
      deletedAt: new Date('2026-05-17T01:00:00.000Z'),
      isActive: false,
    });

    await service.remove('template-1', 'seller-1');

    expect(prisma.customOrderQuoteTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'template-1' },
        data: expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      }),
    );
  });
});
