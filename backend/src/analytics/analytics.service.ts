import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private readonly revenueStatuses: OrderStatus[] = [
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];

  async getSellerRevenueOverTime(sellerId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const subOrders = await this.prisma.subOrder.findMany({
      where: {
        sellerId,
        status: { in: this.revenueStatuses },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        subTotal: true,
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

    subOrders.forEach(so => {
      const dateStr = so.createdAt.toISOString().split('T')[0];
      const existing = revenueMap.get(dateStr) || 0;
      revenueMap.set(dateStr, existing + Number(so.subTotal));
    });

    return Array.from(revenueMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }

  async getSellerRevenueByCategory(sellerId: string, month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        subOrder: {
          sellerId,
          status: { in: this.revenueStatuses },
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const categoryMap = new Map<string, number>();

    orderItems.forEach(item => {
      const categoryName = item.product.category.name;
      const amount = Number(item.price) * item.quantity;
      const existing = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, existing + amount);
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }
}
