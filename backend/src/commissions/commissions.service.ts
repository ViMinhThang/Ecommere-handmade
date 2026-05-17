import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommissionPostStatus,
  CommissionProposalStatus,
  CustomOrderStatus,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommissionPostDto } from './dto/create-commission-post.dto';
import { CreateCommissionProposalDto } from './dto/create-commission-proposal.dto';
import { UpdateCommissionProposalDto } from './dto/update-commission-proposal.dto';

const POST_INCLUDE = {
  customer: { select: { id: true, name: true, avatar: true } },
  selectedProposal: {
    include: {
      seller: { select: { id: true, name: true, shopName: true, avatar: true } },
    },
  },
  proposals: {
    include: {
      seller: { select: { id: true, name: true, shopName: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(roles: string[]) {
    return roles.includes(Role.ROLE_ADMIN);
  }

  private isSeller(roles: string[]) {
    return roles.includes(Role.ROLE_SELLER) || this.isAdmin(roles);
  }

  private mapPost(post: Prisma.CommissionPostGetPayload<{ include: typeof POST_INCLUDE }>) {
    return {
      ...post,
      budgetMin: post.budgetMin?.toString() ?? null,
      budgetMax: post.budgetMax?.toString() ?? null,
      proposals: post.proposals.map((proposal) => ({
        ...proposal,
        proposedPrice: proposal.proposedPrice.toString(),
      })),
      selectedProposal: post.selectedProposal
        ? {
            ...post.selectedProposal,
            proposedPrice: post.selectedProposal.proposedPrice.toString(),
          }
        : null,
    };
  }

  async createPost(customerId: string, dto: CreateCommissionPostDto) {
    if (
      dto.budgetMin !== undefined &&
      dto.budgetMax !== undefined &&
      dto.budgetMin > dto.budgetMax
    ) {
      throw new BadRequestException('Minimum budget cannot exceed maximum budget');
    }

    const post = await this.prisma.commissionPost.create({
      data: {
        customerId,
        title: dto.title,
        description: dto.description,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        desiredTimeline: dto.desiredTimeline,
        referenceImages: dto.referenceImages ?? [],
      },
      include: POST_INCLUDE,
    });

    return this.mapPost(post);
  }

  async listMyPosts(customerId: string) {
    const posts = await this.prisma.commissionPost.findMany({
      where: { customerId },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((post) => this.mapPost(post));
  }

  async listOpenPosts() {
    const posts = await this.prisma.commissionPost.findMany({
      where: { status: CommissionPostStatus.OPEN },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((post) => this.mapPost(post));
  }

  async listMyProposals(sellerId: string) {
    const proposals = await this.prisma.commissionProposal.findMany({
      where: { sellerId },
      include: {
        seller: { select: { id: true, name: true, shopName: true, avatar: true } },
        commission: {
          include: {
            customer: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return proposals.map((proposal) => ({
      ...proposal,
      proposedPrice: proposal.proposedPrice.toString(),
      commission: {
        ...proposal.commission,
        budgetMin: proposal.commission.budgetMin?.toString() ?? null,
        budgetMax: proposal.commission.budgetMax?.toString() ?? null,
      },
    }));
  }

  async getPost(id: string, userId: string, roles: string[]) {
    const post = await this.prisma.commissionPost.findUnique({
      where: { id },
      include: POST_INCLUDE,
    });
    if (!post) throw new NotFoundException('Commission post not found');

    const canSeeAllProposals = post.customerId === userId || this.isAdmin(roles);
    const mapped = this.mapPost(post);
    if (canSeeAllProposals) return mapped;

    if (this.isSeller(roles)) {
      return {
        ...mapped,
        proposals: mapped.proposals.filter(
          (proposal) =>
            proposal.sellerId === userId ||
            proposal.status === CommissionProposalStatus.ACCEPTED,
        ),
      };
    }

    if (post.status === CommissionPostStatus.OPEN) {
      return { ...mapped, proposals: [] };
    }

    throw new ForbiddenException('Cannot access this commission');
  }

  async submitProposal(
    commissionId: string,
    sellerId: string,
    dto: CreateCommissionProposalDto,
  ) {
    const seller = await this.prisma.user.findFirst({
      where: {
        id: sellerId,
        status: UserStatus.ACTIVE,
        roles: { has: Role.ROLE_SELLER },
      },
    });
    if (!seller) throw new ForbiddenException('Only active sellers can propose');

    const post = await this.prisma.commissionPost.findUnique({
      where: { id: commissionId },
    });
    if (!post) throw new NotFoundException('Commission post not found');
    if (post.customerId === sellerId) {
      throw new BadRequestException('Cannot propose on your own commission');
    }
    if (post.status !== CommissionPostStatus.OPEN) {
      throw new BadRequestException('Commission is not open for proposals');
    }

    return this.prisma.commissionProposal.create({
      data: {
        commissionId,
        sellerId,
        message: dto.message,
        proposedPrice: dto.proposedPrice,
        proposedLeadTime: dto.proposedLeadTime,
        sketchImageUrl: dto.sketchImageUrl,
      },
      include: {
        seller: { select: { id: true, name: true, shopName: true, avatar: true } },
      },
    });
  }

  async updateProposal(
    proposalId: string,
    sellerId: string,
    dto: UpdateCommissionProposalDto,
  ) {
    const proposal = await this.getProposalForSeller(proposalId, sellerId);
    if (proposal.status !== CommissionProposalStatus.PENDING) {
      throw new BadRequestException('Only pending proposals can be updated');
    }

    return this.prisma.commissionProposal.update({
      where: { id: proposalId },
      data: {
        message: dto.message,
        proposedPrice: dto.proposedPrice,
        proposedLeadTime: dto.proposedLeadTime,
        sketchImageUrl: dto.sketchImageUrl,
      },
    });
  }

  async withdrawProposal(proposalId: string, sellerId: string) {
    const proposal = await this.getProposalForSeller(proposalId, sellerId);
    if (proposal.status !== CommissionProposalStatus.PENDING) {
      throw new BadRequestException('Only pending proposals can be withdrawn');
    }

    return this.prisma.commissionProposal.update({
      where: { id: proposalId },
      data: { status: CommissionProposalStatus.WITHDRAWN },
    });
  }

  private async getProposalForSeller(proposalId: string, sellerId: string) {
    const proposal = await this.prisma.commissionProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.sellerId !== sellerId) {
      throw new ForbiddenException('Cannot manage this proposal');
    }
    return proposal;
  }

  async chooseProposal(commissionId: string, proposalId: string, customerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.commissionPost.findUnique({
        where: { id: commissionId },
      });
      if (!post) throw new NotFoundException('Commission post not found');
      if (post.customerId !== customerId) {
        throw new ForbiddenException('Cannot choose proposal for this commission');
      }
      if (post.status !== CommissionPostStatus.OPEN) {
        throw new BadRequestException('Commission is no longer open');
      }

      const proposal = await tx.commissionProposal.findFirst({
        where: {
          id: proposalId,
          commissionId,
          status: CommissionProposalStatus.PENDING,
        },
      });
      if (!proposal) throw new NotFoundException('Proposal not found');

      const customOrder = await tx.customOrder.create({
        data: {
          customerId: post.customerId,
          sellerId: proposal.sellerId,
          title: post.title,
          artisanNote: proposal.message,
          price: proposal.proposedPrice,
          leadTime: proposal.proposedLeadTime,
          sketchImageUrl: proposal.sketchImageUrl ?? post.referenceImages[0],
          specifications: [
            { label: 'Commission description', value: post.description },
            ...(post.desiredTimeline
              ? [{ label: 'Desired timeline', value: post.desiredTimeline }]
              : []),
          ] as Prisma.InputJsonValue,
          status: CustomOrderStatus.PENDING_REVIEW,
        },
      });

      await tx.commissionProposal.update({
        where: { id: proposal.id },
        data: { status: CommissionProposalStatus.ACCEPTED },
      });
      await tx.commissionProposal.updateMany({
        where: {
          commissionId,
          id: { not: proposal.id },
          status: CommissionProposalStatus.PENDING,
        },
        data: { status: CommissionProposalStatus.REJECTED },
      });
      await tx.commissionPost.update({
        where: { id: commissionId },
        data: {
          status: CommissionPostStatus.ASSIGNED,
          selectedProposalId: proposal.id,
          customOrderId: customOrder.id,
          closedAt: new Date(),
        },
      });

      return customOrder;
    });
  }

  async closePost(id: string, customerId: string) {
    const post = await this.prisma.commissionPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Commission post not found');
    if (post.customerId !== customerId) {
      throw new ForbiddenException('Cannot close this commission');
    }
    if (post.status !== CommissionPostStatus.OPEN) {
      throw new BadRequestException('Commission is not open');
    }

    return this.prisma.commissionPost.update({
      where: { id },
      data: { status: CommissionPostStatus.CLOSED, closedAt: new Date() },
    });
  }
}
