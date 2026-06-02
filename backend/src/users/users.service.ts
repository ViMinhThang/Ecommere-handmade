import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, ProductStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  SearchSellersQueryDto,
  SellerSearchSortBy,
} from './dto/search-sellers-query.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private readonly userSelect = {
    id: true,
    name: true,
    email: true,
    roles: true,
    status: true,
    avatar: true,
    phone: true,
    shopName: true,
    sellerTitle: true,
    sellerBio: true,
    sellerAbout: true,
    sellerHeroImage: true,
    sellerAboutImage: true,
    sellerStat1Label: true,
    sellerStat1Value: true,
    sellerStat2Label: true,
    sellerStat2Value: true,
    artisanVerified: true,
    craftSpecialty: true,
    craftExperienceYears: true,
    craftMaterials: true,
    shopReturnPolicy: true,
    shopShippingPolicy: true,
    shopProcessingTime: true,
    shopPolicyUpdatedAt: true,
    verificationNote: true,
    isEmailVerified: true,
    rewardPointsBalance: true,
    createdAt: true,
    updatedAt: true,
    addresses: true,
  };

  private readonly publicSellerSelect = {
    id: true,
    name: true,
    avatar: true,
    shopName: true,
    sellerTitle: true,
    sellerBio: true,
    sellerAbout: true,
    sellerHeroImage: true,
    sellerAboutImage: true,
    sellerStat1Label: true,
    sellerStat1Value: true,
    sellerStat2Label: true,
    sellerStat2Value: true,
    artisanVerified: true,
    craftSpecialty: true,
    craftExperienceYears: true,
    craftMaterials: true,
    shopReturnPolicy: true,
    shopShippingPolicy: true,
    shopProcessingTime: true,
    shopPolicyUpdatedAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private readonly publicSellerWithFollowerCountSelect = {
    ...this.publicSellerSelect,
    _count: {
      select: {
        shopFollowers: true,
      },
    },
  } as const;

  private normalizeSellerSearchLimit(limit?: number) {
    if (!limit || !Number.isFinite(limit)) {
      return 9;
    }

    return Math.min(Math.max(Math.floor(limit), 1), 24);
  }

  private normalizeNullableText(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private hasShopPolicyPatch(
    dto: Pick<
      UpdateProfileDto | CreateUserDto,
      'shopReturnPolicy' | 'shopShippingPolicy' | 'shopProcessingTime'
    >,
  ) {
    return (
      Object.prototype.hasOwnProperty.call(dto, 'shopReturnPolicy') ||
      Object.prototype.hasOwnProperty.call(dto, 'shopShippingPolicy') ||
      Object.prototype.hasOwnProperty.call(dto, 'shopProcessingTime')
    );
  }

  private processRoles(
    roles?: ('ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN')[],
  ): ('ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN')[] {
    if (!roles || roles.length === 0) {
      return ['ROLE_USER'];
    }

    const roleSet = new Set(roles);

    if (roleSet.has('ROLE_ADMIN')) {
      return ['ROLE_USER', 'ROLE_SELLER', 'ROLE_ADMIN'];
    }

    if (roleSet.has('ROLE_SELLER')) {
      return ['ROLE_USER', 'ROLE_SELLER'];
    }

    return ['ROLE_USER'];
  }

  async create(createUserDto: CreateUserDto) {
    const roles = this.processRoles(createUserDto.roles);
    const isSellerAccount =
      roles.includes(Role.ROLE_SELLER) && !roles.includes(Role.ROLE_ADMIN);
    const password = createUserDto.password?.trim();
    if (!password) {
      throw new BadRequestException(
        'Password is required when creating a user',
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        roles,
        avatar: createUserDto.avatar,
        phone: createUserDto.phone,
        shopName: createUserDto.shopName,
        sellerTitle: createUserDto.sellerTitle,
        sellerBio: createUserDto.sellerBio,
        sellerAbout: createUserDto.sellerAbout,
        sellerHeroImage: createUserDto.sellerHeroImage,
        sellerAboutImage: createUserDto.sellerAboutImage,
        sellerStat1Label: createUserDto.sellerStat1Label,
        sellerStat1Value: createUserDto.sellerStat1Value,
        sellerStat2Label: createUserDto.sellerStat2Label,
        sellerStat2Value: createUserDto.sellerStat2Value,
        artisanVerified: isSellerAccount
          ? (createUserDto.artisanVerified ?? false)
          : false,
        craftSpecialty: isSellerAccount
          ? createUserDto.craftSpecialty
          : undefined,
        craftExperienceYears: isSellerAccount
          ? createUserDto.craftExperienceYears
          : undefined,
        craftMaterials: isSellerAccount
          ? (createUserDto.craftMaterials ?? [])
          : [],
        shopReturnPolicy: isSellerAccount
          ? this.normalizeNullableText(createUserDto.shopReturnPolicy)
          : undefined,
        shopShippingPolicy: isSellerAccount
          ? this.normalizeNullableText(createUserDto.shopShippingPolicy)
          : undefined,
        shopProcessingTime: isSellerAccount
          ? this.normalizeNullableText(createUserDto.shopProcessingTime)
          : undefined,
        shopPolicyUpdatedAt:
          isSellerAccount && this.hasShopPolicyPatch(createUserDto)
            ? new Date()
            : undefined,
        verificationNote: isSellerAccount
          ? createUserDto.verificationNote
          : undefined,
        status: createUserDto.status,
        isEmailVerified: createUserDto.isEmailVerified ?? false,
      },
      select: this.userSelect,
    });
  }

  async findAll(role?: string, status?: string, pagination?: PaginationDto) {
    const where: {
      roles?: { has: 'ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN' };
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
      deletedAt: null;
    } = {
      deletedAt: null,
    };
    if (role) {
      where.roles = {
        has: role.toUpperCase() as 'ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN',
      };
    }
    if (status)
      where.status = status.toUpperCase() as
        | 'ACTIVE'
        | 'INACTIVE'
        | 'SUSPENDED'
        | 'PENDING';

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          roles: true,
          status: true,
          avatar: true,
          phone: true,
          shopName: true,
          sellerTitle: true,
          sellerBio: true,
          sellerAbout: true,
          sellerHeroImage: true,
          sellerAboutImage: true,
          sellerStat1Label: true,
          sellerStat1Value: true,
          sellerStat2Label: true,
          sellerStat2Value: true,
          artisanVerified: true,
          craftSpecialty: true,
          craftExperienceYears: true,
          craftMaterials: true,
          shopReturnPolicy: true,
          shopShippingPolicy: true,
          shopProcessingTime: true,
          shopPolicyUpdatedAt: true,
          verificationNote: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          addresses: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    const usersWithMetrics = await Promise.all(
      data.map(async (user) => {
        const [ordersCount, totalSpent, sales] = await Promise.all([
          this.prisma.order.count({
            where: { customerId: user.id },
          }),
          this.prisma.order.aggregate({
            where: {
              customerId: user.id,
              status: { not: 'CANCELLED' },
            },
            _sum: { totalAmount: true },
          }),
          this.prisma.subOrder.count({
            where: { sellerId: user.id },
          }),
        ]);

        return {
          ...user,
          ordersCount,
          totalSpent: Number(totalSpent._sum.totalAmount ?? 0),
          sales,
        };
      }),
    );

    return {
      data: usersWithMetrics,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private getCustomerSearchFilter(q?: string): Prisma.UserWhereInput | null {
    const search = q?.trim();
    if (!search || search.length < 2) {
      return null;
    }

    return {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  private getSellerKnownCustomerFilter(
    sellerId: string,
  ): Prisma.UserWhereInput {
    return {
      OR: [
        { customerConversations: { some: { sellerId } } },
        { customerCustomOrders: { some: { sellerId } } },
        { Order: { some: { subOrders: { some: { sellerId } } } } },
      ],
    };
  }

  async findCustomersForSeller(
    actorId: string,
    roles: string[],
    pagination?: PaginationDto & { q?: string },
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;
    const isAdmin = roles.includes(Role.ROLE_ADMIN);
    const searchFilter = this.getCustomerSearchFilter(pagination?.q);

    const baseWhere: Prisma.UserWhereInput = {
      deletedAt: null,
      status: UserStatus.ACTIVE,
      roles: { has: Role.ROLE_USER },
      NOT: [
        { roles: { has: Role.ROLE_SELLER } },
        { roles: { has: Role.ROLE_ADMIN } },
      ],
    };
    const scopedFilters = [
      ...(searchFilter ? [searchFilter] : []),
      ...(!isAdmin ? [this.getSellerKnownCustomerFilter(actorId)] : []),
    ];
    const where: Prisma.UserWhereInput =
      scopedFilters.length > 0
        ? { ...baseWhere, AND: scopedFilters }
        : baseWhere;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          roles: true,
          status: true,
          avatar: true,
          phone: true,
          shopName: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: this.userSelect,
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findPublicSellerById(id: string) {
    const seller = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        roles: { has: Role.ROLE_SELLER },
        NOT: {
          roles: { has: Role.ROLE_ADMIN },
        },
      },
      select: this.publicSellerWithFollowerCountSelect,
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return {
      ...this.formatPublicSeller(seller),
      ...(await this.getShopRatingFields(id)),
    };
  }

  async getShopFollowStatus(
    customerId: string,
    roles: string[],
    sellerId: string,
  ) {
    this.assertCanUseShopFollow(customerId, roles, sellerId);
    await this.assertFollowableSeller(sellerId);

    const [existingFollow, followerCount] = await Promise.all([
      this.prisma.shopFollow.findUnique({
        where: {
          customerId_sellerId: {
            customerId,
            sellerId,
          },
        },
        select: { id: true },
      }),
      this.countShopFollowers(sellerId),
    ]);

    return {
      sellerId,
      isFollowing: Boolean(existingFollow),
      followerCount,
    };
  }

  async followShop(customerId: string, roles: string[], sellerId: string) {
    this.assertCanUseShopFollow(customerId, roles, sellerId);
    await this.assertFollowableSeller(sellerId);

    await this.prisma.shopFollow.upsert({
      where: {
        customerId_sellerId: {
          customerId,
          sellerId,
        },
      },
      update: {},
      create: {
        customerId,
        sellerId,
      },
    });

    return {
      sellerId,
      isFollowing: true,
      followerCount: await this.countShopFollowers(sellerId),
    };
  }

  async unfollowShop(customerId: string, roles: string[], sellerId: string) {
    this.assertCanUseShopFollow(customerId, roles, sellerId);
    await this.assertFollowableSeller(sellerId);

    await this.prisma.shopFollow.deleteMany({
      where: {
        customerId,
        sellerId,
      },
    });

    return {
      sellerId,
      isFollowing: false,
      followerCount: await this.countShopFollowers(sellerId),
    };
  }

  async listFollowedShops(customerId: string, roles: string[]) {
    if (!roles.includes(Role.ROLE_USER)) {
      return [];
    }

    const follows = await this.prisma.shopFollow.findMany({
      where: {
        customerId,
        seller: {
          deletedAt: null,
          status: UserStatus.ACTIVE,
          roles: { has: Role.ROLE_SELLER },
          NOT: {
            roles: { has: Role.ROLE_ADMIN },
          },
        },
      },
      include: {
        seller: {
          select: this.publicSellerWithFollowerCountSelect,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return follows.map((follow) => ({
      id: follow.id,
      sellerId: follow.sellerId,
      createdAt: follow.createdAt,
      seller: this.formatPublicSeller(follow.seller),
    }));
  }

  async searchSellers(query: SearchSellersQueryDto) {
    const trimmedQuery = query.q?.trim() || undefined;
    const page = Math.max(query.page ?? 1, 1);
    const limit = this.normalizeSellerSearchLimit(query.limit);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'relevance';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      status: UserStatus.ACTIVE,
      roles: { has: Role.ROLE_SELLER },
      NOT: {
        roles: { has: Role.ROLE_ADMIN },
      },
    };

    if (trimmedQuery) {
      where.OR = [
        { name: { contains: trimmedQuery, mode: 'insensitive' } },
        { shopName: { contains: trimmedQuery, mode: 'insensitive' } },
        { sellerBio: { contains: trimmedQuery, mode: 'insensitive' } },
        { sellerAbout: { contains: trimmedQuery, mode: 'insensitive' } },
        { shopProcessingTime: { contains: trimmedQuery, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.user.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const searchPattern = trimmedQuery ? `%${trimmedQuery}%` : null;
    const prefixPattern = trimmedQuery ? `${trimmedQuery}%` : null;
    const directionSql =
      sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const orderBySql = this.buildSellerSearchOrderBy({
      sortBy,
      directionSql,
      searchPattern,
      prefixPattern,
    });

    type SellerSearchRow = {
      id: string;
      name: string;
      shopName: string | null;
      avatar: string | null;
      sellerTitle: string | null;
      sellerBio: string | null;
      artisanVerified: boolean;
      craftSpecialty: string | null;
      craftExperienceYears: number | null;
      craftMaterials: string[];
      shopProcessingTime: string | null;
      createdAt: Date;
      productCount: number | bigint;
      averageRating: number | null;
      totalReviews: number | bigint;
      followerCount: number | bigint;
      shopAverageRating: number | null;
      shopReviewCount: number | bigint;
    };

    const rows = await this.prisma.$queryRaw<SellerSearchRow[]>(Prisma.sql`
      SELECT
        u.id,
        u.name,
        u.avatar,
        u."shopName",
        u."sellerTitle",
        u."sellerBio",
        u."artisanVerified",
        u."craftSpecialty",
        u."craftExperienceYears",
        u."craftMaterials",
        u."shopProcessingTime",
        u."createdAt",
        COUNT(DISTINCT p.id)::int AS "productCount",
        COUNT(DISTINCT sf.id)::int AS "followerCount",
        CASE
          WHEN COUNT(sr.id) = 0 THEN NULL
          ELSE ROUND(AVG(sr.rating)::numeric, 1)::double precision
        END AS "shopAverageRating",
        COUNT(DISTINCT sr.id)::int AS "shopReviewCount",
        CASE
          WHEN COUNT(r.id) = 0 THEN NULL
          ELSE ROUND(AVG(r.rating)::numeric, 1)::double precision
        END AS "averageRating",
        COUNT(DISTINCT r.id)::int AS "totalReviews"
      FROM "User" u
      LEFT JOIN "Product" p
        ON p."sellerId" = u.id
        AND p."deletedAt" IS NULL
        AND p.status = ${ProductStatus.APPROVED}::"ProductStatus"
      LEFT JOIN "Review" r ON r."productId" = p.id
      LEFT JOIN "ShopFollow" sf ON sf."sellerId" = u.id
      LEFT JOIN "ShopReview" sr ON sr."sellerId" = u.id
      WHERE u."deletedAt" IS NULL
        AND u.status = ${UserStatus.ACTIVE}::"UserStatus"
        AND u.roles @> ARRAY[${Role.ROLE_SELLER}]::"Role"[]
        AND NOT (u.roles @> ARRAY[${Role.ROLE_ADMIN}]::"Role"[])
        ${
          trimmedQuery
            ? Prisma.sql`
              AND (
                u.name ILIKE ${searchPattern}
                OR COALESCE(u."shopName", '') ILIKE ${searchPattern}
                OR COALESCE(u."sellerBio", '') ILIKE ${searchPattern}
                OR COALESCE(u."sellerAbout", '') ILIKE ${searchPattern}
                OR COALESCE(u."craftSpecialty", '') ILIKE ${searchPattern}
                OR COALESCE(u."shopProcessingTime", '') ILIKE ${searchPattern}
              )
            `
            : Prisma.empty
        }
      GROUP BY u.id
      ${orderBySql}
      LIMIT ${limit}
      OFFSET ${skip}
    `);

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        shopName: row.shopName,
        avatar: row.avatar,
        sellerTitle: row.sellerTitle,
        sellerBio: row.sellerBio,
        artisanVerified: row.artisanVerified,
        craftSpecialty: row.craftSpecialty,
        craftExperienceYears: row.craftExperienceYears,
        craftMaterials: row.craftMaterials,
        shopProcessingTime: row.shopProcessingTime,
        productCount: Number(row.productCount),
        averageRating: row.averageRating,
        totalReviews: Number(row.totalReviews),
        followerCount: Number(row.followerCount),
        shopAverageRating: row.shopAverageRating,
        shopReviewCount: Number(row.shopReviewCount),
        createdAt: row.createdAt,
        linkTarget: `/sellers/${row.id}`,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private buildSellerSearchOrderBy({
    sortBy,
    directionSql,
    searchPattern,
    prefixPattern,
  }: {
    sortBy: SellerSearchSortBy;
    directionSql: Prisma.Sql;
    searchPattern: string | null;
    prefixPattern: string | null;
  }) {
    if (sortBy === 'newest') {
      return Prisma.sql`
        ORDER BY u."createdAt" ${directionSql}, "productCount" DESC, u.id ASC
      `;
    }

    if (sortBy === 'productCount') {
      return Prisma.sql`
        ORDER BY "productCount" ${directionSql}, u."createdAt" DESC, u.id ASC
      `;
    }

    if (sortBy === 'rating') {
      return Prisma.sql`
        ORDER BY COALESCE("averageRating", 0) ${directionSql},
                 "totalReviews" ${directionSql},
                 "productCount" DESC,
                 u."createdAt" DESC,
                 u.id ASC
      `;
    }

    if (searchPattern && prefixPattern) {
      return Prisma.sql`
        ORDER BY CASE
          WHEN COALESCE(u."shopName", '') ILIKE ${prefixPattern} THEN 0
          WHEN u.name ILIKE ${prefixPattern} THEN 1
          WHEN COALESCE(u."shopName", '') ILIKE ${searchPattern} THEN 2
          WHEN u.name ILIKE ${searchPattern} THEN 3
          WHEN COALESCE(u."sellerBio", '') ILIKE ${searchPattern}
            OR COALESCE(u."sellerAbout", '') ILIKE ${searchPattern}
            OR COALESCE(u."craftSpecialty", '') ILIKE ${searchPattern}
            THEN 4
          ELSE 5
        END ASC,
        "productCount" DESC,
        u."createdAt" DESC,
        u.id ASC
      `;
    }

    return Prisma.sql`
      ORDER BY "productCount" DESC, u."createdAt" DESC, u.id ASC
    `;
  }

  private formatPublicSeller<T extends { _count?: { shopFollowers?: number } }>(
    seller: T,
  ) {
    const { _count, ...publicSeller } = seller;

    return {
      ...publicSeller,
      followerCount: _count?.shopFollowers ?? 0,
    };
  }

  private async getShopRatingFields(sellerId: string) {
    const aggregate = await this.prisma.shopReview.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    const averageRating = aggregate._avg.rating;

    return {
      shopAverageRating:
        averageRating === null ? null : Math.round(averageRating * 10) / 10,
      shopReviewCount: aggregate._count._all,
    };
  }

  private assertCanUseShopFollow(
    customerId: string,
    roles: string[],
    sellerId: string,
  ) {
    if (!roles.includes(Role.ROLE_USER)) {
      throw new ForbiddenException('Customer role is required');
    }

    if (customerId === sellerId) {
      throw new BadRequestException('You cannot follow your own shop');
    }
  }

  private async assertFollowableSeller(sellerId: string) {
    const seller = await this.prisma.user.findFirst({
      where: {
        id: sellerId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        roles: { has: Role.ROLE_SELLER },
        NOT: {
          roles: { has: Role.ROLE_ADMIN },
        },
      },
      select: { id: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
  }

  private countShopFollowers(sellerId: string) {
    return this.prisma.shopFollow.count({
      where: {
        sellerId,
        seller: {
          deletedAt: null,
          status: UserStatus.ACTIVE,
          roles: { has: Role.ROLE_SELLER },
          NOT: {
            roles: { has: Role.ROLE_ADMIN },
          },
        },
      },
    });
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const {
      name,
      avatar,
      phone,
      shopName,
      sellerTitle,
      sellerBio,
      sellerAbout,
      sellerHeroImage,
      sellerAboutImage,
      sellerStat1Label,
      sellerStat1Value,
      sellerStat2Label,
      sellerStat2Value,
      craftSpecialty,
      craftExperienceYears,
      craftMaterials,
      shopReturnPolicy,
      shopShippingPolicy,
      shopProcessingTime,
    } = updateProfileDto;

    const isSellerAccount =
      user.roles.includes(Role.ROLE_SELLER) &&
      !user.roles.includes(Role.ROLE_ADMIN);
    const normalizedShopReturnPolicy =
      this.normalizeNullableText(shopReturnPolicy);
    const normalizedShopShippingPolicy =
      this.normalizeNullableText(shopShippingPolicy);
    const normalizedShopProcessingTime =
      this.normalizeNullableText(shopProcessingTime);
    const shopPolicyChanged =
      isSellerAccount &&
      ((shopReturnPolicy !== undefined &&
        normalizedShopReturnPolicy !== user.shopReturnPolicy) ||
        (shopShippingPolicy !== undefined &&
          normalizedShopShippingPolicy !== user.shopShippingPolicy) ||
        (shopProcessingTime !== undefined &&
          normalizedShopProcessingTime !== user.shopProcessingTime));
    const updateData: Prisma.UserUpdateInput = {
      name,
      avatar,
      phone,
      ...(isSellerAccount
        ? {
            shopName,
            sellerTitle,
            sellerBio,
            sellerAbout,
            sellerHeroImage,
            sellerAboutImage,
            sellerStat1Label,
            sellerStat1Value,
            sellerStat2Label,
            sellerStat2Value,
            craftSpecialty,
            craftExperienceYears,
            craftMaterials,
            shopReturnPolicy: normalizedShopReturnPolicy,
            shopShippingPolicy: normalizedShopShippingPolicy,
            shopProcessingTime: normalizedShopProcessingTime,
            ...(shopPolicyChanged ? { shopPolicyUpdatedAt: new Date() } : {}),
          }
        : {}),
    };

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.userSelect,
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(dto.newPassword, 12) },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revoked: false },
      data: { revoked: true },
    });

    return { success: true };
  }

  async update(id: string, updateUserDto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    let roles = user.roles;
    if (updateUserDto.roles) {
      roles = this.processRoles(updateUserDto.roles);
    }

    const isSellerAccount =
      roles.includes(Role.ROLE_SELLER) && !roles.includes(Role.ROLE_ADMIN);

    if (updateUserDto.artisanVerified && !isSellerAccount) {
      throw new BadRequestException('Only seller accounts can be verified');
    }

    const password = updateUserDto.password
      ? await bcrypt.hash(updateUserDto.password, 10)
      : undefined;
    const updateData: AdminUpdateUserDto = { ...updateUserDto };
    delete updateData.password;

    if (!isSellerAccount) {
      updateData.artisanVerified = false;
      delete updateData.craftSpecialty;
      delete updateData.craftExperienceYears;
      delete updateData.craftMaterials;
      delete updateData.shopReturnPolicy;
      delete updateData.shopShippingPolicy;
      delete updateData.shopProcessingTime;
      delete updateData.verificationNote;
    }

    const normalizedShopReturnPolicy = this.normalizeNullableText(
      updateUserDto.shopReturnPolicy,
    );
    const normalizedShopShippingPolicy = this.normalizeNullableText(
      updateUserDto.shopShippingPolicy,
    );
    const normalizedShopProcessingTime = this.normalizeNullableText(
      updateUserDto.shopProcessingTime,
    );
    const shopPolicyChanged =
      isSellerAccount &&
      ((updateUserDto.shopReturnPolicy !== undefined &&
        normalizedShopReturnPolicy !== user.shopReturnPolicy) ||
        (updateUserDto.shopShippingPolicy !== undefined &&
          normalizedShopShippingPolicy !== user.shopShippingPolicy) ||
        (updateUserDto.shopProcessingTime !== undefined &&
          normalizedShopProcessingTime !== user.shopProcessingTime));

    if (isSellerAccount) {
      updateData.shopReturnPolicy = normalizedShopReturnPolicy as
        | string
        | undefined;
      updateData.shopShippingPolicy = normalizedShopShippingPolicy as
        | string
        | undefined;
      updateData.shopProcessingTime = normalizedShopProcessingTime as
        | string
        | undefined;
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        ...(password ? { password } : {}),
        ...(shopPolicyChanged ? { shopPolicyUpdatedAt: new Date() } : {}),
        roles,
      },
      select: this.userSelect,
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.prisma.user.delete({ where: { id } });
  }

  async getStats() {
    const [total, admins, sellers, customers] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { roles: { has: 'ROLE_ADMIN' }, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { roles: { has: 'ROLE_SELLER' }, deletedAt: null },
      }),
      this.prisma.user.count({
        where: {
          roles: { has: 'ROLE_USER' },
          NOT: [
            { roles: { has: 'ROLE_SELLER' } },
            { roles: { has: 'ROLE_ADMIN' } },
          ],
          deletedAt: null,
        },
      }),
    ]);

    return { total, admins, sellers, customers };
  }

  async addAddress(userId: string, createAddressDto: CreateAddressDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (createAddressDto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const addressCount = await this.prisma.address.count({
      where: { userId, deletedAt: null },
    });

    if (addressCount >= 5) {
      throw new BadRequestException('Maximum 5 addresses allowed');
    }

    return this.prisma.address.create({
      data: {
        ...createAddressDto,
        userId,
      },
    });
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    updateAddressDto: Partial<CreateAddressDto>,
  ) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) {
      throw new NotFoundException(`Address not found`);
    }

    if (updateAddressDto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: updateAddressDto,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) {
      throw new NotFoundException(`Address not found`);
    }
    return this.prisma.address.delete({ where: { id: addressId } });
  }

  async updateOtpFields(
    userId: string,
    data: {
      otpCode?: string | null;
      otpExpires?: Date | null;
      isEmailVerified?: boolean;
      password?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
