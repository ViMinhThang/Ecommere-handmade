import { Test, TestingModule } from '@nestjs/testing';
import {
  MarketplaceLedgerEntryStatus,
  MarketplaceLedgerEntryType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

type LedgerFindManyArgs = {
  where?: {
    sellerId?: string;
    status?: MarketplaceLedgerEntryStatus;
    type?: { in: MarketplaceLedgerEntryType[] };
  };
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockPrisma = {
    marketplaceLedgerEntry: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('calculates seller revenue from posted ledger entries', async () => {
    mockPrisma.marketplaceLedgerEntry.findMany.mockResolvedValue([
      { amount: 90000, createdAt: new Date('2026-05-01T10:00:00Z') },
      { amount: -30000, createdAt: new Date('2026-05-01T11:00:00Z') },
    ]);

    const result = await service.getSellerRevenueOverTime(
      'seller_1',
      '2026-05-01',
      '2026-05-01',
    );

    const findManyMock = mockPrisma.marketplaceLedgerEntry
      .findMany as jest.MockedFunction<(args: LedgerFindManyArgs) => unknown>;
    const call = findManyMock.mock.calls.at(-1)?.[0];
    expect(call?.where).toMatchObject({
      sellerId: 'seller_1',
      status: MarketplaceLedgerEntryStatus.POSTED,
      type: {
        in: [
          MarketplaceLedgerEntryType.SELLER_EARNING,
          MarketplaceLedgerEntryType.REFUND,
        ],
      },
    });
    expect(result).toEqual([{ date: '2026-05-01', revenue: 60000 }]);
  });

  it('allocates category revenue from ledger entries using original gross', async () => {
    mockPrisma.marketplaceLedgerEntry.findMany.mockResolvedValue([
      {
        amount: 90000,
        subOrder: {
          items: [
            {
              quantity: 1,
              price: 80000,
              originalPrice: 100000,
              product: { category: { name: 'Ceramics' } },
            },
          ],
        },
      },
    ]);

    const result = await service.getSellerRevenueByCategory(
      'seller_1',
      5,
      2026,
    );

    expect(result).toEqual([{ name: 'Ceramics', value: 90000 }]);
  });
});
