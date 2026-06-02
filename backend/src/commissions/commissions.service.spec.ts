import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CommissionPostStatus,
  CommissionProposalStatus,
  CustomOrderStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { CommissionsService } from './commissions.service';

describe('CommissionsService', () => {
  let prisma: {
    commissionPost: Record<string, jest.Mock>;
    commissionProposal: Record<string, jest.Mock>;
    customOrder: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let service: CommissionsService;

  beforeEach(() => {
    prisma = {
      commissionPost: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      commissionProposal: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      customOrder: {
        create: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };
    service = new CommissionsService(prisma as never);
  });

  it('creates a customer commission post', async () => {
    prisma.commissionPost.create.mockResolvedValue({
      id: 'commission-1',
      customerId: 'customer-1',
      title: 'Custom vase',
      description: 'A tall handmade vase',
      budgetMin: { toString: () => '100000' },
      budgetMax: { toString: () => '200000' },
      referenceImages: [],
      status: CommissionPostStatus.OPEN,
      proposals: [],
      selectedProposal: null,
    });

    const result = await service.createPost('customer-1', {
      title: 'Custom vase',
      description: 'A tall handmade vase',
      budgetMin: 100000,
      budgetMax: 200000,
    });

    expect(prisma.commissionPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'customer-1',
          title: 'Custom vase',
        }),
      }),
    );
    expect(result.budgetMin).toBe('100000');
  });

  it('rejects inverted commission budget ranges', async () => {
    await expect(
      service.createPost('customer-1', {
        title: 'Custom vase',
        description: 'A tall handmade vase',
        budgetMin: 300000,
        budgetMax: 100000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns open commission threads publicly with visible proposals', async () => {
    prisma.commissionPost.findUnique.mockResolvedValue({
      id: 'commission-1',
      customerId: 'customer-1',
      title: 'Custom vase',
      description: 'A tall handmade vase',
      budgetMin: null,
      budgetMax: { toString: () => '200000' },
      referenceImages: [],
      status: CommissionPostStatus.OPEN,
      proposals: [
        {
          id: 'proposal-1',
          commissionId: 'commission-1',
          sellerId: 'seller-1',
          message: 'I can make this with walnut and brass.',
          proposedPrice: { toString: () => '180000' },
          proposedLeadTime: '2 weeks',
          sketchImageUrl: null,
          status: CommissionProposalStatus.PENDING,
          seller: {
            id: 'seller-1',
            name: 'Studio One',
            shopName: 'Walnut Studio',
            avatar: null,
          },
        },
      ],
      selectedProposal: null,
    });

    const result = await service.getPost('commission-1');

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].proposedPrice).toBe('180000');
    expect(result.proposals[0].seller?.shopName).toBe('Walnut Studio');
  });

  it('keeps cancelled commissions private to unrelated visitors', async () => {
    prisma.commissionPost.findUnique.mockResolvedValue({
      id: 'commission-1',
      customerId: 'customer-1',
      title: 'Custom vase',
      description: 'A tall handmade vase',
      budgetMin: null,
      budgetMax: null,
      referenceImages: [],
      status: CommissionPostStatus.CANCELLED,
      proposals: [],
      selectedProposal: null,
    });

    await expect(service.getPost('commission-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets an active seller submit one proposal to an open commission', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'seller-1' });
    prisma.commissionPost.findUnique.mockResolvedValue({
      id: 'commission-1',
      customerId: 'customer-1',
      status: CommissionPostStatus.OPEN,
    });
    prisma.commissionProposal.create.mockResolvedValue({ id: 'proposal-1' });

    await service.submitProposal('commission-1', 'seller-1', {
      message: 'I can make this with walnut and brass.',
      proposedPrice: 250000,
      proposedLeadTime: '2 weeks',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'seller-1',
        status: UserStatus.ACTIVE,
        roles: { has: Role.ROLE_SELLER },
      },
    });
    expect(prisma.commissionProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commissionId: 'commission-1',
          sellerId: 'seller-1',
        }),
      }),
    );
  });

  it('prevents proposals on closed commissions', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'seller-1' });
    prisma.commissionPost.findUnique.mockResolvedValue({
      id: 'commission-1',
      customerId: 'customer-1',
      status: CommissionPostStatus.CLOSED,
    });

    await expect(
      service.submitProposal('commission-1', 'seller-1', {
        message: 'I can make this with walnut and brass.',
        proposedPrice: 250000,
        proposedLeadTime: '2 weeks',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents customers from choosing proposals on another customer commission', async () => {
    prisma.commissionPost.findUnique.mockResolvedValue({
      id: 'commission-1',
      customerId: 'customer-1',
      status: CommissionPostStatus.OPEN,
    });

    await expect(
      service.chooseProposal('commission-1', 'proposal-1', 'customer-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('chooses a proposal, creates one custom order, and rejects other pending proposals', async () => {
    prisma.commissionPost.findUnique.mockResolvedValue({
      id: 'commission-1',
      customerId: 'customer-1',
      title: 'Custom vase',
      description: 'A tall handmade vase',
      desiredTimeline: '3 weeks',
      referenceImages: ['https://example.com/reference.jpg'],
      status: CommissionPostStatus.OPEN,
    });
    prisma.commissionProposal.findFirst.mockResolvedValue({
      id: 'proposal-1',
      commissionId: 'commission-1',
      sellerId: 'seller-1',
      message: 'I can make this with walnut and brass.',
      proposedPrice: 250000,
      proposedLeadTime: '2 weeks',
      sketchImageUrl: null,
      status: CommissionProposalStatus.PENDING,
    });
    prisma.customOrder.create.mockResolvedValue({ id: 'custom-order-1' });

    const result = await service.chooseProposal(
      'commission-1',
      'proposal-1',
      'customer-1',
    );

    expect(prisma.customOrder.create).toHaveBeenCalledTimes(1);
    expect(prisma.customOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'customer-1',
        sellerId: 'seller-1',
        status: CustomOrderStatus.PENDING_REVIEW,
      }),
    });
    expect(prisma.commissionProposal.updateMany).toHaveBeenCalledWith({
      where: {
        commissionId: 'commission-1',
        id: { not: 'proposal-1' },
        status: CommissionProposalStatus.PENDING,
      },
      data: { status: CommissionProposalStatus.REJECTED },
    });
    expect(prisma.commissionPost.update).toHaveBeenCalledWith({
      where: { id: 'commission-1' },
      data: expect.objectContaining({
        status: CommissionPostStatus.ASSIGNED,
        selectedProposalId: 'proposal-1',
        customOrderId: 'custom-order-1',
      }),
    });
    expect(result).toEqual({ id: 'custom-order-1' });
  });

  it('throws when selected proposal does not exist', async () => {
    prisma.commissionPost.findUnique.mockResolvedValue({
      id: 'commission-1',
      customerId: 'customer-1',
      status: CommissionPostStatus.OPEN,
    });
    prisma.commissionProposal.findFirst.mockResolvedValue(null);

    await expect(
      service.chooseProposal('commission-1', 'proposal-1', 'customer-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
