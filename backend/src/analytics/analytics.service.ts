import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MarketplaceLedgerEntryStatus,
  MarketplaceLedgerEntryType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private readonly revenueLedgerTypes: MarketplaceLedgerEntryType[] = [
    MarketplaceLedgerEntryType.SELLER_EARNING,
    MarketplaceLedgerEntryType.REFUND,
  ];

  async getSellerRevenueOverTime(
    sellerId: string,
    startDate: string,
    endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const ledgerEntries = await this.prisma.marketplaceLedgerEntry.findMany({
      where: {
        sellerId,
        status: MarketplaceLedgerEntryStatus.POSTED,
        type: { in: this.revenueLedgerTypes },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by day for the chart
    const revenueMap = new Map<string, number>();

    // Initialize map with all days in range to ensure zero-revenue days are shown
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      revenueMap.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    ledgerEntries.forEach((entry) => {
      const dateStr = entry.createdAt.toISOString().split('T')[0];
      const existing = revenueMap.get(dateStr) || 0;
      revenueMap.set(dateStr, existing + Number(entry.amount));
    });

    return Array.from(revenueMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }

  async getSellerRevenueByCategory(
    sellerId: string,
    month: number,
    year: number,
  ) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const ledgerEntries = await this.prisma.marketplaceLedgerEntry.findMany({
      where: {
        sellerId,
        status: MarketplaceLedgerEntryStatus.POSTED,
        type: { in: this.revenueLedgerTypes },
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        subOrder: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const categoryMap = new Map<string, number>();

    ledgerEntries.forEach((entry) => {
      const items = entry.subOrder?.items ?? [];
      const grossTotal = items.reduce(
        (sum, item) => sum + this.getItemGross(item),
        0,
      );

      for (const item of items) {
        const categoryName = item.product.category.name;
        const ratio = grossTotal > 0 ? this.getItemGross(item) / grossTotal : 0;
        const amount = Number(entry.amount) * ratio;
        const existing = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, existing + amount);
      }
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }

  private getItemGross(item: {
    quantity: number;
    price: Prisma.Decimal | number;
    originalPrice: Prisma.Decimal | number;
  }) {
    const originalPrice =
      Number(item.originalPrice) === 0
        ? Number(item.price)
        : Number(item.originalPrice);

    return originalPrice * item.quantity;
  }
}
