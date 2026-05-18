import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProductStatus,
  ReportStatus,
  ReportType,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    reporterId: string,
    reporterRoles: string[],
    dto: CreateReportDto,
  ) {
    const reason = dto.reason.trim();
    const description = dto.description?.trim() || undefined;
    if (!reason) {
      throw new BadRequestException('Report reason is required');
    }

    await this.assertValidTarget(reporterId, reporterRoles, dto);

    return this.prisma.report.create({
      data: {
        reporterId,
        type: dto.type,
        targetUserId: dto.targetUserId ?? null,
        targetProductId: dto.targetProductId ?? null,
        orderId: dto.orderId ?? null,
        reason,
        description,
      },
      include: this.reportInclude,
    });
  }

  async findMine(userId: string, page = 1, limit = 20) {
    const normalizedPage = Math.max(Math.floor(Number(page) || 1), 1);
    const normalizedLimit = Math.min(
      Math.max(Math.floor(Number(limit) || 20), 1),
      50,
    );

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { reporterId: userId },
        include: this.reportInclude,
        orderBy: { createdAt: 'desc' },
        skip: (normalizedPage - 1) * normalizedLimit,
        take: normalizedLimit,
      }),
      this.prisma.report.count({ where: { reporterId: userId } }),
    ]);

    return {
      data,
      meta: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / normalizedLimit),
      },
    };
  }

  async findAdmin(params?: {
    status?: ReportStatus;
    type?: ReportType;
    page?: number;
    limit?: number;
  }) {
    const normalizedPage = Math.max(Math.floor(Number(params?.page) || 1), 1);
    const normalizedLimit = Math.min(
      Math.max(Math.floor(Number(params?.limit) || 20), 1),
      50,
    );
    const where = {
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.type ? { type: params.type } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: this.reportInclude,
        orderBy: { createdAt: 'desc' },
        skip: (normalizedPage - 1) * normalizedLimit,
        take: normalizedLimit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / normalizedLimit),
      },
    };
  }

  async updateStatus(
    reportId: string,
    adminId: string,
    dto: UpdateReportStatusDto,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const isTerminal =
      dto.status === ReportStatus.RESOLVED ||
      dto.status === ReportStatus.REJECTED;

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        adminNote: dto.adminNote?.trim() || null,
        resolvedById: isTerminal ? adminId : null,
        resolvedAt: isTerminal ? new Date() : null,
      },
      include: this.reportInclude,
    });
  }

  private async assertValidTarget(
    reporterId: string,
    reporterRoles: string[],
    dto: CreateReportDto,
  ) {
    switch (dto.type) {
      case ReportType.SHOP:
        await this.assertShopTarget(reporterId, dto.targetUserId);
        break;
      case ReportType.CUSTOMER:
        await this.assertCustomerTarget(
          reporterId,
          reporterRoles,
          dto.targetUserId,
        );
        break;
      case ReportType.PRODUCT:
        await this.assertProductTarget(dto.targetProductId);
        break;
      case ReportType.ORDER:
        await this.assertOrderTarget(reporterId, reporterRoles, dto.orderId);
        break;
      default:
        throw new BadRequestException('Invalid report type');
    }
  }

  private async assertShopTarget(reporterId: string, targetUserId?: string) {
    if (!targetUserId) {
      throw new BadRequestException('Shop report requires targetUserId');
    }

    if (targetUserId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }

    const seller = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        roles: { has: Role.ROLE_SELLER },
      },
      select: { id: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
  }

  private async assertCustomerTarget(
    reporterId: string,
    reporterRoles: string[],
    targetUserId?: string,
  ) {
    if (!targetUserId) {
      throw new BadRequestException('Customer report requires targetUserId');
    }

    if (targetUserId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }

    if (
      !reporterRoles.includes(Role.ROLE_SELLER) &&
      !reporterRoles.includes(Role.ROLE_ADMIN)
    ) {
      throw new ForbiddenException(
        'Only sellers or admins can report customers',
      );
    }

    const customer = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        roles: { has: Role.ROLE_USER },
      },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (reporterRoles.includes(Role.ROLE_ADMIN)) {
      return;
    }

    const hasInteraction = await this.hasSellerCustomerInteraction(
      reporterId,
      targetUserId,
    );
    if (!hasInteraction) {
      throw new ForbiddenException(
        'You can only report customers that interacted with your shop',
      );
    }
  }

  private async assertProductTarget(targetProductId?: string) {
    if (!targetProductId) {
      throw new BadRequestException('Product report requires targetProductId');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: targetProductId,
        deletedAt: null,
        status: ProductStatus.APPROVED,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private async assertOrderTarget(
    reporterId: string,
    reporterRoles: string[],
    orderId?: string,
  ) {
    if (!orderId) {
      throw new BadRequestException('Order report requires orderId');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        subOrders: { select: { sellerId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isAdmin = reporterRoles.includes(Role.ROLE_ADMIN);
    const isCustomer = order.customerId === reporterId;
    const isSeller = order.subOrders.some(
      (subOrder) => subOrder.sellerId === reporterId,
    );

    if (!isAdmin && !isCustomer && !isSeller) {
      throw new ForbiddenException('You can only report related orders');
    }
  }

  private async hasSellerCustomerInteraction(
    sellerId: string,
    customerId: string,
  ) {
    const [subOrder, customOrder, conversation] = await Promise.all([
      this.prisma.subOrder.findFirst({
        where: {
          sellerId,
          order: { customerId },
        },
        select: { id: true },
      }),
      this.prisma.customOrder.findFirst({
        where: { sellerId, customerId },
        select: { id: true },
      }),
      this.prisma.chatConversation.findFirst({
        where: { sellerId, customerId },
        select: { id: true },
      }),
    ]);

    return Boolean(subOrder || customOrder || conversation);
  }

  private readonly userSummarySelect = {
    id: true,
    name: true,
    email: true,
    shopName: true,
    avatar: true,
    roles: true,
  } as const;

  private readonly reportInclude = {
    reporter: { select: this.userSummarySelect },
    targetUser: { select: this.userSummarySelect },
    targetProduct: {
      select: {
        id: true,
        name: true,
        sellerId: true,
      },
    },
    order: {
      select: {
        id: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
      },
    },
    resolvedBy: { select: this.userSummarySelect },
  } as const;
}
