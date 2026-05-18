import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  CustomOrderStatus,
  MarketplaceLedgerEntryStatus,
  MarketplaceLedgerEntryType,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentReliabilityAnomaliesQueryDto,
  PaymentReliabilityAnomalyType,
  PaymentReliabilityEntityType,
  PaymentReliabilityReconciliationQueryDto,
  PaymentReliabilityReconciliationStatus,
  PaymentReliabilitySeverity,
  PaymentReliabilitySummaryQueryDto,
  PaymentReliabilityWebhooksQueryDto,
  paymentReliabilityAnomalyTypes,
  paymentReliabilitySeverities,
} from './dto/payment-reliability-query.dto';

const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 90;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const CURRENCY = 'vnd';
const SUCCEEDED_WEBHOOK_TYPE = 'payment_intent.succeeded';
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_HEURISTIC_NOTE =
  'Payment may have been confirmed through the client confirmation path.';

interface DateWindow {
  from: Date;
  to: Date;
}

interface PaginationState {
  page: number;
  limit: number;
}

interface StripeOrderSnapshot {
  id: string;
  status: string;
  paymentStatus: PaymentStatus;
  paymentIntentId: string | null;
  paymentExpiresAt: Date | null;
  totalAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  refunds: Array<{ amount: number; status: RefundStatus }>;
}

interface CustomOrderSnapshot {
  id: string;
  status: CustomOrderStatus;
  paymentStatus: PaymentStatus;
  paymentIntentId: string | null;
  paymentExpiresAt: Date | null;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  refunds: Array<{ amount: number; status: RefundStatus }>;
}

interface ReliabilityDataset {
  orders: StripeOrderSnapshot[];
  customOrders: CustomOrderSnapshot[];
  capturedOrderIds: Set<string>;
  capturedCustomOrderIds: Set<string>;
  succeededWebhookIntentIds: Set<string>;
}

export interface PaymentReliabilityAnomalyRow {
  id: string;
  type: PaymentReliabilityAnomalyType;
  severity: PaymentReliabilitySeverity;
  entityType: PaymentReliabilityEntityType;
  entityId: string;
  paymentIntentId: string | null;
  orderStatus: string;
  paymentStatus: PaymentStatus;
  occurredAt: Date;
  details: Record<string, unknown>;
}

export interface PaymentReconciliationRow {
  id: string;
  entityType: PaymentReliabilityEntityType;
  entityId: string;
  paymentIntentId: string | null;
  orderStatus: string;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  status: PaymentReliabilityReconciliationStatus;
  issues: PaymentReliabilityAnomalyType[];
}

type ReconciliationIssueCode =
  | 'UNPAID_EXPIRED'
  | 'MISSING_CAPTURE_LEDGER'
  | 'REFUND_STATUS_MISMATCH'
  | 'PAID_WITHOUT_WEBHOOK';

@Injectable()
export class PaymentReliabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    userRoles: string[],
    query: PaymentReliabilitySummaryQueryDto,
  ) {
    this.assertAdmin(userRoles);

    const window = this.resolveDateWindow(query.from, query.to);
    const dataset = await this.loadReliabilityDataset(window);
    const anomalies = this.buildAnomalies(dataset, new Date());
    const reconciliation = this.buildReconciliationRows(dataset, new Date());

    const bySeverity = paymentReliabilitySeverities.reduce<
      Record<PaymentReliabilitySeverity, number>
    >(
      (acc, severity) => ({
        ...acc,
        [severity]: anomalies.filter((row) => row.severity === severity).length,
      }),
      {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      },
    );

    const byType = paymentReliabilityAnomalyTypes.reduce<
      Record<PaymentReliabilityAnomalyType, number>
    >(
      (acc, type) => ({
        ...acc,
        [type]: anomalies.filter((row) => row.type === type).length,
      }),
      {
        STRIPE_ORDER_UNPAID_EXPIRED: 0,
        CUSTOM_ORDER_UNPAID_EXPIRED: 0,
        PAID_ORDER_MISSING_CAPTURE_LEDGER: 0,
        REFUND_STATUS_MISMATCH: 0,
        PAID_WITHOUT_WEBHOOK_RECORD: 0,
      },
    );

    const webhookEventsInWindow = await this.prisma.paymentWebhookEvent.count({
      where: {
        processedAt: {
          gte: window.from,
          lte: window.to,
        },
      },
    });

    return {
      totals: {
        stripeOrders: dataset.orders.length,
        customOrders: dataset.customOrders.length,
        webhookEvents: webhookEventsInWindow,
        anomalies: anomalies.length,
        reconciliationRows: reconciliation.length,
        unreconciled: reconciliation.filter(
          (row) => row.status !== 'RECONCILED',
        ).length,
      },
      bySeverity,
      byType,
      generatedAt: new Date().toISOString(),
    };
  }

  async getAnomalies(
    userRoles: string[],
    query: PaymentReliabilityAnomaliesQueryDto,
  ) {
    this.assertAdmin(userRoles);

    const window = this.resolveDateWindow(query.from, query.to);
    const pagination = this.normalizePagination(query.page, query.limit);
    const anomalies = this.buildAnomalies(
      await this.loadReliabilityDataset(window),
      new Date(),
    )
      .filter((row) => (query.type ? row.type === query.type : true))
      .filter((row) =>
        query.severity ? row.severity === query.severity : true,
      )
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    return this.toPaginatedResponse(anomalies, pagination);
  }

  async getReconciliation(
    userRoles: string[],
    query: PaymentReliabilityReconciliationQueryDto,
  ) {
    this.assertAdmin(userRoles);

    const window = this.resolveDateWindow(query.from, query.to);
    const pagination = this.normalizePagination(query.page, query.limit);
    const rows = this.buildReconciliationRows(
      await this.loadReliabilityDataset(window),
      new Date(),
    )
      .filter((row) =>
        query.entityType ? row.entityType === query.entityType : true,
      )
      .filter((row) => (query.status ? row.status === query.status : true))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return this.toPaginatedResponse(rows, pagination);
  }

  async getWebhooks(
    userRoles: string[],
    query: PaymentReliabilityWebhooksQueryDto,
  ) {
    this.assertAdmin(userRoles);

    const window = this.resolveDateWindow(query.from, query.to);
    const pagination = this.normalizePagination(query.page, query.limit);
    const where = {
      processedAt: {
        gte: window.from,
        lte: window.to,
      },
      ...(query.type ? { type: query.type } : {}),
    };

    const [total, events] = await Promise.all([
      this.prisma.paymentWebhookEvent.count({ where }),
      this.prisma.paymentWebhookEvent.findMany({
        where,
        orderBy: { processedAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        select: {
          id: true,
          eventId: true,
          type: true,
          paymentIntentId: true,
          processedAt: true,
        },
      }),
    ]);

    const paymentIntentIds = events
      .map((event) => event.paymentIntentId)
      .filter((value): value is string => typeof value === 'string');

    const [orders, customOrders] = paymentIntentIds.length
      ? await Promise.all([
          this.prisma.order.findMany({
            where: { paymentIntentId: { in: paymentIntentIds } },
            select: { id: true, paymentIntentId: true },
          }),
          this.prisma.customOrder.findMany({
            where: { paymentIntentId: { in: paymentIntentIds } },
            select: { id: true, paymentIntentId: true },
          }),
        ])
      : [[], []];

    const orderMap = new Map(
      orders
        .filter((row) => typeof row.paymentIntentId === 'string')
        .map((row) => [row.paymentIntentId as string, row.id]),
    );
    const customOrderMap = new Map(
      customOrders
        .filter((row) => typeof row.paymentIntentId === 'string')
        .map((row) => [row.paymentIntentId as string, row.id]),
    );

    return {
      data: events.map((event) => ({
        id: event.id,
        eventId: event.eventId,
        type: event.type,
        paymentIntentId: event.paymentIntentId,
        processedAt: event.processedAt,
        entityType: event.paymentIntentId
          ? orderMap.has(event.paymentIntentId)
            ? 'ORDER'
            : customOrderMap.has(event.paymentIntentId)
              ? 'CUSTOM_ORDER'
              : null
          : null,
        entityId: event.paymentIntentId
          ? (orderMap.get(event.paymentIntentId) ??
            customOrderMap.get(event.paymentIntentId) ??
            null)
          : null,
      })),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit),
      },
    };
  }

  private toPaginatedResponse<T>(rows: T[], pagination: PaginationState) {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const data = rows.slice(start, end);
    const total = rows.length;

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit),
      },
    };
  }

  private assertAdmin(userRoles: string[]) {
    if (!userRoles.includes('ROLE_ADMIN')) {
      throw new ForbiddenException('Access denied');
    }
  }

  private normalizePagination(page?: number, limit?: number): PaginationState {
    const normalizedPage =
      !page || !Number.isFinite(page)
        ? DEFAULT_PAGE
        : Math.max(Math.floor(page), DEFAULT_PAGE);
    const normalizedLimit =
      !limit || !Number.isFinite(limit)
        ? DEFAULT_LIMIT
        : Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);

    return {
      page: normalizedPage,
      limit: normalizedLimit,
    };
  }

  private resolveDateWindow(from?: string, to?: string): DateWindow {
    const now = new Date(Date.now());
    const parsedFrom = from ? this.parseDateInput(from, 'from') : null;
    const parsedTo = to ? this.parseDateInput(to, 'to') : null;

    const resolvedFrom = parsedFrom
      ? parsedFrom
      : parsedTo
        ? new Date(parsedTo.getTime() - DEFAULT_WINDOW_DAYS * DAY_IN_MS)
        : new Date(now.getTime() - DEFAULT_WINDOW_DAYS * DAY_IN_MS);
    const resolvedTo = parsedTo
      ? parsedTo
      : parsedFrom
        ? new Date(parsedFrom.getTime() + DEFAULT_WINDOW_DAYS * DAY_IN_MS)
        : now;

    if (resolvedFrom > resolvedTo) {
      throw new BadRequestException('from must be earlier than to');
    }

    if (
      resolvedTo.getTime() - resolvedFrom.getTime() >
      MAX_WINDOW_DAYS * DAY_IN_MS
    ) {
      throw new BadRequestException(
        `Date window must not exceed ${MAX_WINDOW_DAYS} days`,
      );
    }

    return {
      from: resolvedFrom,
      to: resolvedTo,
    };
  }

  private parseDateInput(value: string, boundary: 'from' | 'to'): Date {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const normalized = isDateOnly
      ? `${value}${boundary === 'to' ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
      : value;
    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${boundary} date`);
    }

    return parsed;
  }

  private async loadReliabilityDataset(
    window: DateWindow,
  ): Promise<ReliabilityDataset> {
    const [orders, customOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          paymentMethod: PaymentMethod.STRIPE,
          createdAt: {
            gte: window.from,
            lte: window.to,
          },
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          paymentIntentId: true,
          paymentExpiresAt: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          refunds: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.customOrder.findMany({
        where: {
          createdAt: {
            gte: window.from,
            lte: window.to,
          },
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          paymentIntentId: true,
          paymentExpiresAt: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          refunds: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const normalizedOrders: StripeOrderSnapshot[] = orders.map((row) => ({
      id: row.id,
      status: row.status,
      paymentStatus: row.paymentStatus,
      paymentIntentId: row.paymentIntentId,
      paymentExpiresAt: row.paymentExpiresAt,
      totalAmount: Number(row.totalAmount),
      currency: row.currency,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      refunds: row.refunds.map((refund) => ({
        amount: Number(refund.amount),
        status: refund.status,
      })),
    }));

    const normalizedCustomOrders: CustomOrderSnapshot[] = customOrders.map(
      (row) => ({
        id: row.id,
        status: row.status,
        paymentStatus: row.paymentStatus,
        paymentIntentId: row.paymentIntentId,
        paymentExpiresAt: row.paymentExpiresAt,
        price: Number(row.price),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        refunds: row.refunds.map((refund) => ({
          amount: Number(refund.amount),
          status: refund.status,
        })),
      }),
    );

    const orderIds = normalizedOrders.map((row) => row.id);
    const customOrderIds = normalizedCustomOrders.map((row) => row.id);
    const paymentIntentIds = [
      ...normalizedOrders
        .map((row) => row.paymentIntentId)
        .filter((value): value is string => typeof value === 'string'),
      ...normalizedCustomOrders
        .map((row) => row.paymentIntentId)
        .filter((value): value is string => typeof value === 'string'),
    ];

    const ledgerOrFilters: Array<Record<string, unknown>> = [];
    if (orderIds.length > 0) {
      ledgerOrFilters.push({ orderId: { in: orderIds } });
    }
    if (customOrderIds.length > 0) {
      ledgerOrFilters.push({ customOrderId: { in: customOrderIds } });
    }

    const [captureLedgerRows, webhookRows] = await Promise.all([
      ledgerOrFilters.length > 0
        ? this.prisma.marketplaceLedgerEntry.findMany({
            where: {
              type: MarketplaceLedgerEntryType.PAYMENT_CAPTURE,
              status: MarketplaceLedgerEntryStatus.POSTED,
              OR: ledgerOrFilters,
            },
            select: {
              orderId: true,
              customOrderId: true,
            },
          })
        : Promise.resolve<
            Array<{ orderId: string | null; customOrderId: string | null }>
          >([]),
      paymentIntentIds.length > 0
        ? this.prisma.paymentWebhookEvent.findMany({
            where: {
              paymentIntentId: {
                in: paymentIntentIds,
              },
            },
            select: {
              paymentIntentId: true,
              type: true,
            },
          })
        : Promise.resolve<
            Array<{ paymentIntentId: string | null; type: string }>
          >([]),
    ]);

    const capturedOrderIds = new Set(
      captureLedgerRows
        .map((row) => row.orderId)
        .filter((value): value is string => typeof value === 'string'),
    );
    const capturedCustomOrderIds = new Set(
      captureLedgerRows
        .map((row) => row.customOrderId)
        .filter((value): value is string => typeof value === 'string'),
    );
    const succeededWebhookIntentIds = new Set(
      webhookRows
        .filter(
          (row) =>
            row.type === SUCCEEDED_WEBHOOK_TYPE &&
            typeof row.paymentIntentId === 'string',
        )
        .map((row) => row.paymentIntentId as string),
    );

    return {
      orders: normalizedOrders,
      customOrders: normalizedCustomOrders,
      capturedOrderIds,
      capturedCustomOrderIds,
      succeededWebhookIntentIds,
    };
  }

  private buildAnomalies(dataset: ReliabilityDataset, now: Date) {
    const anomalies: PaymentReliabilityAnomalyRow[] = [];

    for (const order of dataset.orders) {
      if (
        this.isExpiredUnpaidOrder(
          order.paymentStatus,
          order.paymentExpiresAt,
          now,
        )
      ) {
        anomalies.push({
          id: `STRIPE_ORDER_UNPAID_EXPIRED:ORDER:${order.id}`,
          type: 'STRIPE_ORDER_UNPAID_EXPIRED',
          severity: 'HIGH',
          entityType: 'ORDER',
          entityId: order.id,
          paymentIntentId: order.paymentIntentId,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          occurredAt: order.paymentExpiresAt ?? order.updatedAt,
          details: {
            paymentExpiresAt: order.paymentExpiresAt?.toISOString() ?? null,
          },
        });
      }

      if (this.isPaidStatus(order.paymentStatus)) {
        if (!dataset.capturedOrderIds.has(order.id)) {
          anomalies.push({
            id: `PAID_ORDER_MISSING_CAPTURE_LEDGER:ORDER:${order.id}`,
            type: 'PAID_ORDER_MISSING_CAPTURE_LEDGER',
            severity: 'MEDIUM',
            entityType: 'ORDER',
            entityId: order.id,
            paymentIntentId: order.paymentIntentId,
            orderStatus: order.status,
            paymentStatus: order.paymentStatus,
            occurredAt: order.updatedAt,
            details: {
              expectedLedgerType: MarketplaceLedgerEntryType.PAYMENT_CAPTURE,
            },
          });
        }

        if (
          this.isRefundStatusMismatch(
            order.totalAmount,
            order.paymentStatus,
            order.refunds,
          )
        ) {
          anomalies.push({
            id: `REFUND_STATUS_MISMATCH:ORDER:${order.id}`,
            type: 'REFUND_STATUS_MISMATCH',
            severity: 'MEDIUM',
            entityType: 'ORDER',
            entityId: order.id,
            paymentIntentId: order.paymentIntentId,
            orderStatus: order.status,
            paymentStatus: order.paymentStatus,
            occurredAt: order.updatedAt,
            details: {
              orderTotal: order.totalAmount,
              refundedAmount: this.getSucceededRefundAmount(order.refunds),
            },
          });
        }

        if (
          order.paymentIntentId &&
          !dataset.succeededWebhookIntentIds.has(order.paymentIntentId)
        ) {
          anomalies.push({
            id: `PAID_WITHOUT_WEBHOOK_RECORD:ORDER:${order.id}`,
            type: 'PAID_WITHOUT_WEBHOOK_RECORD',
            severity: 'LOW',
            entityType: 'ORDER',
            entityId: order.id,
            paymentIntentId: order.paymentIntentId,
            orderStatus: order.status,
            paymentStatus: order.paymentStatus,
            occurredAt: order.updatedAt,
            details: {
              expectedWebhookType: SUCCEEDED_WEBHOOK_TYPE,
              isHeuristic: true,
              note: WEBHOOK_HEURISTIC_NOTE,
            },
          });
        }
      }
    }

    for (const customOrder of dataset.customOrders) {
      if (
        this.isExpiredUnpaidOrder(
          customOrder.paymentStatus,
          customOrder.paymentExpiresAt,
          now,
        ) &&
        customOrder.status === CustomOrderStatus.AWAITING_PAYMENT
      ) {
        anomalies.push({
          id: `CUSTOM_ORDER_UNPAID_EXPIRED:CUSTOM_ORDER:${customOrder.id}`,
          type: 'CUSTOM_ORDER_UNPAID_EXPIRED',
          severity: 'HIGH',
          entityType: 'CUSTOM_ORDER',
          entityId: customOrder.id,
          paymentIntentId: customOrder.paymentIntentId,
          orderStatus: customOrder.status,
          paymentStatus: customOrder.paymentStatus,
          occurredAt: customOrder.paymentExpiresAt ?? customOrder.updatedAt,
          details: {
            paymentExpiresAt:
              customOrder.paymentExpiresAt?.toISOString() ?? null,
          },
        });
      }

      if (this.isPaidStatus(customOrder.paymentStatus)) {
        if (!dataset.capturedCustomOrderIds.has(customOrder.id)) {
          anomalies.push({
            id: `PAID_ORDER_MISSING_CAPTURE_LEDGER:CUSTOM_ORDER:${customOrder.id}`,
            type: 'PAID_ORDER_MISSING_CAPTURE_LEDGER',
            severity: 'MEDIUM',
            entityType: 'CUSTOM_ORDER',
            entityId: customOrder.id,
            paymentIntentId: customOrder.paymentIntentId,
            orderStatus: customOrder.status,
            paymentStatus: customOrder.paymentStatus,
            occurredAt: customOrder.updatedAt,
            details: {
              expectedLedgerType: MarketplaceLedgerEntryType.PAYMENT_CAPTURE,
            },
          });
        }

        if (
          this.isRefundStatusMismatch(
            customOrder.price,
            customOrder.paymentStatus,
            customOrder.refunds,
          )
        ) {
          anomalies.push({
            id: `REFUND_STATUS_MISMATCH:CUSTOM_ORDER:${customOrder.id}`,
            type: 'REFUND_STATUS_MISMATCH',
            severity: 'MEDIUM',
            entityType: 'CUSTOM_ORDER',
            entityId: customOrder.id,
            paymentIntentId: customOrder.paymentIntentId,
            orderStatus: customOrder.status,
            paymentStatus: customOrder.paymentStatus,
            occurredAt: customOrder.updatedAt,
            details: {
              orderTotal: customOrder.price,
              refundedAmount: this.getSucceededRefundAmount(
                customOrder.refunds,
              ),
            },
          });
        }

        if (
          customOrder.paymentIntentId &&
          !dataset.succeededWebhookIntentIds.has(customOrder.paymentIntentId)
        ) {
          anomalies.push({
            id: `PAID_WITHOUT_WEBHOOK_RECORD:CUSTOM_ORDER:${customOrder.id}`,
            type: 'PAID_WITHOUT_WEBHOOK_RECORD',
            severity: 'LOW',
            entityType: 'CUSTOM_ORDER',
            entityId: customOrder.id,
            paymentIntentId: customOrder.paymentIntentId,
            orderStatus: customOrder.status,
            paymentStatus: customOrder.paymentStatus,
            occurredAt: customOrder.updatedAt,
            details: {
              expectedWebhookType: SUCCEEDED_WEBHOOK_TYPE,
              isHeuristic: true,
              note: WEBHOOK_HEURISTIC_NOTE,
            },
          });
        }
      }
    }

    return anomalies;
  }

  private buildReconciliationRows(dataset: ReliabilityDataset, now: Date) {
    const rows: PaymentReconciliationRow[] = [];

    for (const order of dataset.orders) {
      const issues = this.collectReconciliationIssues(
        {
          paymentStatus: order.paymentStatus,
          paymentExpiresAt: order.paymentExpiresAt,
          amount: order.totalAmount,
          refunds: order.refunds,
          paymentIntentId: order.paymentIntentId,
        },
        {
          hasCaptureLedger: dataset.capturedOrderIds.has(order.id),
          hasSucceededWebhook:
            order.paymentIntentId !== null &&
            dataset.succeededWebhookIntentIds.has(order.paymentIntentId),
        },
        now,
      );

      rows.push({
        id: `ORDER:${order.id}`,
        entityType: 'ORDER',
        entityId: order.id,
        paymentIntentId: order.paymentIntentId,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        amount: order.totalAmount,
        currency: order.currency || CURRENCY,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        status: this.mapIssuesToReconciliationStatus(
          issues,
          order.paymentStatus,
        ),
        issues: this.mapIssuesToAnomalyTypes(issues, 'ORDER'),
      });
    }

    for (const customOrder of dataset.customOrders) {
      const issues = this.collectReconciliationIssues(
        {
          paymentStatus: customOrder.paymentStatus,
          paymentExpiresAt: customOrder.paymentExpiresAt,
          amount: customOrder.price,
          refunds: customOrder.refunds,
          paymentIntentId: customOrder.paymentIntentId,
        },
        {
          hasCaptureLedger: dataset.capturedCustomOrderIds.has(customOrder.id),
          hasSucceededWebhook:
            customOrder.paymentIntentId !== null &&
            dataset.succeededWebhookIntentIds.has(customOrder.paymentIntentId),
        },
        now,
      );

      rows.push({
        id: `CUSTOM_ORDER:${customOrder.id}`,
        entityType: 'CUSTOM_ORDER',
        entityId: customOrder.id,
        paymentIntentId: customOrder.paymentIntentId,
        orderStatus: customOrder.status,
        paymentStatus: customOrder.paymentStatus,
        amount: customOrder.price,
        currency: CURRENCY,
        createdAt: customOrder.createdAt,
        updatedAt: customOrder.updatedAt,
        status: this.mapIssuesToReconciliationStatus(
          issues,
          customOrder.paymentStatus,
        ),
        issues: this.mapIssuesToAnomalyTypes(issues, 'CUSTOM_ORDER'),
      });
    }

    return rows;
  }

  private collectReconciliationIssues(
    base: {
      paymentStatus: PaymentStatus;
      paymentExpiresAt: Date | null;
      amount: number;
      refunds: Array<{ amount: number; status: RefundStatus }>;
      paymentIntentId: string | null;
    },
    checks: {
      hasCaptureLedger: boolean;
      hasSucceededWebhook: boolean;
    },
    now: Date,
  ): ReconciliationIssueCode[] {
    const issues: ReconciliationIssueCode[] = [];

    if (
      this.isExpiredUnpaidOrder(base.paymentStatus, base.paymentExpiresAt, now)
    ) {
      issues.push('UNPAID_EXPIRED');
    }

    if (this.isPaidStatus(base.paymentStatus)) {
      if (!checks.hasCaptureLedger) {
        issues.push('MISSING_CAPTURE_LEDGER');
      }

      if (
        this.isRefundStatusMismatch(
          base.amount,
          base.paymentStatus,
          base.refunds,
        )
      ) {
        issues.push('REFUND_STATUS_MISMATCH');
      }

      if (base.paymentIntentId && !checks.hasSucceededWebhook) {
        issues.push('PAID_WITHOUT_WEBHOOK');
      }
    }

    return issues;
  }

  private mapIssuesToReconciliationStatus(
    issues: ReconciliationIssueCode[],
    paymentStatus: PaymentStatus,
  ): PaymentReliabilityReconciliationStatus {
    if (issues.includes('UNPAID_EXPIRED')) {
      return 'UNPAID_EXPIRED';
    }
    if (issues.includes('MISSING_CAPTURE_LEDGER')) {
      return 'MISSING_CAPTURE_LEDGER';
    }
    if (issues.includes('REFUND_STATUS_MISMATCH')) {
      return 'REFUND_STATUS_MISMATCH';
    }
    if (issues.includes('PAID_WITHOUT_WEBHOOK')) {
      return 'PAID_WITHOUT_WEBHOOK';
    }
    if (paymentStatus === PaymentStatus.UNPAID) {
      return 'PENDING_PAYMENT';
    }

    return 'RECONCILED';
  }

  private mapIssuesToAnomalyTypes(
    issues: ReconciliationIssueCode[],
    entityType: PaymentReliabilityEntityType,
  ): PaymentReliabilityAnomalyType[] {
    const types: PaymentReliabilityAnomalyType[] = [];

    if (issues.includes('UNPAID_EXPIRED')) {
      types.push(
        entityType === 'ORDER'
          ? 'STRIPE_ORDER_UNPAID_EXPIRED'
          : 'CUSTOM_ORDER_UNPAID_EXPIRED',
      );
    }
    if (issues.includes('MISSING_CAPTURE_LEDGER')) {
      types.push('PAID_ORDER_MISSING_CAPTURE_LEDGER');
    }
    if (issues.includes('REFUND_STATUS_MISMATCH')) {
      types.push('REFUND_STATUS_MISMATCH');
    }
    if (issues.includes('PAID_WITHOUT_WEBHOOK')) {
      types.push('PAID_WITHOUT_WEBHOOK_RECORD');
    }

    return types;
  }

  private isPaidStatus(paymentStatus: PaymentStatus) {
    return (
      paymentStatus === PaymentStatus.PAID ||
      paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
      paymentStatus === PaymentStatus.REFUNDED
    );
  }

  private isExpiredUnpaidOrder(
    paymentStatus: PaymentStatus,
    paymentExpiresAt: Date | null,
    now: Date,
  ) {
    return (
      paymentStatus === PaymentStatus.UNPAID &&
      paymentExpiresAt !== null &&
      paymentExpiresAt < now
    );
  }

  private getSucceededRefundAmount(
    refunds: Array<{ amount: number; status: RefundStatus }>,
  ) {
    return refunds
      .filter((refund) => refund.status === RefundStatus.SUCCEEDED)
      .reduce((sum, refund) => sum + refund.amount, 0);
  }

  private isRefundStatusMismatch(
    totalAmount: number,
    paymentStatus: PaymentStatus,
    refunds: Array<{ amount: number; status: RefundStatus }>,
  ) {
    const refundedAmount = this.getSucceededRefundAmount(refunds);

    if (paymentStatus === PaymentStatus.PAID) {
      return refundedAmount > 0;
    }

    if (paymentStatus === PaymentStatus.PARTIALLY_REFUNDED) {
      return refundedAmount <= 0 || refundedAmount >= totalAmount;
    }

    if (paymentStatus === PaymentStatus.REFUNDED) {
      return refundedAmount !== totalAmount;
    }

    return false;
  }
}
