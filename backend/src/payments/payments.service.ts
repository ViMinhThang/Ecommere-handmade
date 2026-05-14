import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface PaymentHistoryItem {
  id: string;
  source: 'ORDER' | 'CUSTOM_ORDER';
  sourceId: string;
  title: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentIntentId: string | null;
  refundedAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPaymentHistory(userId: string): Promise<PaymentHistoryItem[]> {
    const [orders, customOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: userId },
        include: { refunds: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customOrder.findMany({
        where: { customerId: userId },
        include: { refunds: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return [
      ...orders.map((order) => ({
        id: `order:${order.id}`,
        source: 'ORDER' as const,
        sourceId: order.id,
        title: `Order #${order.id.slice(0, 8).toUpperCase()}`,
        amount: Number(order.totalAmount),
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentIntentId: order.paymentIntentId,
        refundedAmount: this.sumRefunds(order.refunds),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      ...customOrders.map((order) => ({
        id: `custom-order:${order.id}`,
        source: 'CUSTOM_ORDER' as const,
        sourceId: order.id,
        title: order.title,
        amount: Number(order.price),
        currency: 'vnd',
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: order.paymentStatus,
        paymentIntentId: order.paymentIntentId,
        refundedAmount: this.sumRefunds(order.refunds),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private sumRefunds(refunds: Array<{ amount: unknown; status: string }>) {
    return refunds
      .filter((refund) => refund.status === 'SUCCEEDED')
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
  }
}
