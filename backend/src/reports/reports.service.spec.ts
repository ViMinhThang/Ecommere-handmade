import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReportStatus, ReportType, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockPrisma = {
    report: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    subOrder: {
      findFirst: jest.fn(),
    },
    customOrder: {
      findFirst: jest.fn(),
    },
    chatConversation: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(mockPrisma as unknown as PrismaService);
    mockPrisma.report.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'report_1', ...data }),
    );
  });

  it('creates a shop report for an active seller target', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'seller_1',
      status: UserStatus.ACTIVE,
      roles: [Role.ROLE_SELLER],
    });

    const result = await service.create('customer_1', [Role.ROLE_USER], {
      type: ReportType.SHOP,
      targetUserId: 'seller_1',
      reason: 'Suspicious shop',
      description: 'The listing details look misleading.',
    });

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'seller_1',
        roles: { has: Role.ROLE_SELLER },
      }),
      select: { id: true },
    });
    expect(result).toMatchObject({
      reporterId: 'customer_1',
      targetUserId: 'seller_1',
      type: ReportType.SHOP,
    });
  });

  it('does not allow reporting yourself', async () => {
    await expect(
      service.create('user_1', [Role.ROLE_USER], {
        type: ReportType.SHOP,
        targetUserId: 'user_1',
        reason: 'Self report',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires seller-customer interaction for seller customer reports', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'customer_1' });
    mockPrisma.subOrder.findFirst.mockResolvedValue(null);
    mockPrisma.customOrder.findFirst.mockResolvedValue(null);
    mockPrisma.chatConversation.findFirst.mockResolvedValue(null);

    await expect(
      service.create('seller_1', [Role.ROLE_SELLER], {
        type: ReportType.CUSTOMER,
        targetUserId: 'customer_1',
        reason: 'Abuse',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('updates report status as an admin action', async () => {
    mockPrisma.report.findUnique.mockResolvedValue({ id: 'report_1' });
    mockPrisma.report.update.mockResolvedValue({
      id: 'report_1',
      status: ReportStatus.RESOLVED,
      resolvedById: 'admin_1',
    });

    const result = await service.updateStatus('report_1', 'admin_1', {
      status: ReportStatus.RESOLVED,
      adminNote: 'Handled',
    });

    expect(mockPrisma.report.update).toHaveBeenCalledWith({
      where: { id: 'report_1' },
      data: expect.objectContaining({
        status: ReportStatus.RESOLVED,
        adminNote: 'Handled',
        resolvedById: 'admin_1',
      }),
      include: expect.any(Object),
    });
    expect(result.status).toBe(ReportStatus.RESOLVED);
  });
});
