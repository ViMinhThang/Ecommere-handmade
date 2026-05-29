import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomOrderStatus,
  MarketplaceLedgerEntryStatus,
  MarketplaceLedgerEntryType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private readonly revenueLedgerTypes: MarketplaceLedgerEntryType[] = [
    MarketplaceLedgerEntryType.SELLER_EARNING,
    MarketplaceLedgerEntryType.REFUND,
  ];

  private readonly revenueSubOrderStatuses: OrderStatus[] = [
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];

  private readonly revenueCustomOrderStatuses: CustomOrderStatus[] = [
    CustomOrderStatus.CRAFTING,
    CustomOrderStatus.FINISHING,
    CustomOrderStatus.SHIPPED,
    CustomOrderStatus.DELIVERED,
  ];

  async getSellerRevenueOverTime(
    sellerId: string,
    startDate: string,
    endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const [ledgerEntries, unpostedSubOrders, unpostedCustomOrders] =
      await Promise.all([
        this.prisma.marketplaceLedgerEntry.findMany({
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
        }),
        this.prisma.subOrder.findMany({
          where: {
            sellerId,
            status: { in: this.revenueSubOrderStatuses },
            createdAt: {
              gte: start,
              lte: end,
            },
            ledgerEntries: {
              none: {
                status: MarketplaceLedgerEntryStatus.POSTED,
                type: MarketplaceLedgerEntryType.SELLER_EARNING,
              },
            },
          },
          select: {
            subTotal: true,
            discountAmount: true,
            createdAt: true,
          },
        }),
        this.prisma.customOrder.findMany({
          where: {
            sellerId,
            paymentStatus: PaymentStatus.PAID,
            status: { in: this.revenueCustomOrderStatuses },
            createdAt: {
              gte: start,
              lte: end,
            },
            ledgerEntries: {
              none: {
                status: MarketplaceLedgerEntryStatus.POSTED,
                type: MarketplaceLedgerEntryType.SELLER_EARNING,
              },
            },
          },
          select: {
            price: true,
            createdAt: true,
          },
        }),
      ]);

    const revenueMap = this.createDailyRevenueMap(start, end);

    ledgerEntries.forEach((entry) => {
      this.addRevenue(revenueMap, entry.createdAt, Number(entry.amount));
    });

    unpostedSubOrders.forEach((subOrder) => {
      this.addRevenue(
        revenueMap,
        subOrder.createdAt,
        Math.max(
          0,
          Number(subOrder.subTotal) - Number(subOrder.discountAmount),
        ),
      );
    });

    unpostedCustomOrders.forEach((customOrder) => {
      this.addRevenue(
        revenueMap,
        customOrder.createdAt,
        Number(customOrder.price),
      );
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

    const [ledgerEntries, unpostedSubOrders] = await Promise.all([
      this.prisma.marketplaceLedgerEntry.findMany({
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
      }),
      this.prisma.subOrder.findMany({
        where: {
          sellerId,
          status: { in: this.revenueSubOrderStatuses },
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          ledgerEntries: {
            none: {
              status: MarketplaceLedgerEntryStatus.POSTED,
              type: MarketplaceLedgerEntryType.SELLER_EARNING,
            },
          },
        },
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
      }),
    ]);

    const categoryMap = new Map<string, number>();

    ledgerEntries.forEach((entry) => {
      this.addSubOrderCategoryRevenue(
        categoryMap,
        entry.subOrder?.items ?? [],
        Number(entry.amount),
      );
    });

    unpostedSubOrders.forEach((subOrder) => {
      this.addSubOrderCategoryRevenue(
        categoryMap,
        subOrder.items,
        Math.max(
          0,
          Number(subOrder.subTotal) - Number(subOrder.discountAmount),
        ),
      );
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }

  private createDailyRevenueMap(start: Date, end: Date) {
    const revenueMap = new Map<string, number>();
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      revenueMap.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return revenueMap;
  }

  private addRevenue(
    revenueMap: Map<string, number>,
    createdAt: Date,
    amount: number,
  ) {
    const dateStr = createdAt.toISOString().split('T')[0];
    const existing = revenueMap.get(dateStr) || 0;
    revenueMap.set(dateStr, existing + amount);
  }

  private addSubOrderCategoryRevenue(
    categoryMap: Map<string, number>,
    items: Array<{
      quantity: number;
      price: Prisma.Decimal | number;
      originalPrice: Prisma.Decimal | number;
      product: { category: { name: string } };
    }>,
    amountToAllocate: number,
  ) {
    const grossTotal = items.reduce(
      (sum, item) => sum + this.getItemGross(item),
      0,
    );

    for (const item of items) {
      const categoryName = item.product.category.name;
      const ratio = grossTotal > 0 ? this.getItemGross(item) / grossTotal : 0;
      const amount = amountToAllocate * ratio;
      const existing = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, existing + amount);
    }
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
