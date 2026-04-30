import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ProductStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  SearchSellersQueryDto,
  SellerSearchSortBy,
  SellerSearchSortOrder,
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
    isEmailVerified: true,
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
    createdAt: true,
    updatedAt: true,
  } as const;

  private normalizeSellerSearchLimit(limit?: number) {
    if (!limit || !Number.isFinite(limit)) {
      return 9;
    }

    return Math.min(Math.max(Math.floor(limit), 1), 24);
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
    const password = createUserDto.password || 'Handmade@123';
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
    const user = await this.prisma.user.findUnique({
      where: { id },
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
        roles: { has: Role.ROLE_SELLER },
        NOT: {
          roles: { has: Role.ROLE_ADMIN },
        },
      },
      select: this.publicSellerSelect,
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return seller;
  }

  async searchSellers(query: SearchSellersQueryDto) {
    const trimmedQuery = query.q?.trim() || undefined;
    const page = Math.max(query.page ?? 1, 1);
    const limit = this.normalizeSellerSearchLimit(query.limit);
    const skip = (page - 1) * limit;
    const sortBy = (query.sortBy ?? 'relevance') as SellerSearchSortBy;
    const sortOrder = (query.sortOrder ?? 'desc') as SellerSearchSortOrder;

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
      createdAt: Date;
      productCount: number | bigint;
      averageRating: number | null;
      totalReviews: number | bigint;
    };

    const rows = await this.prisma.$queryRaw<SellerSearchRow[]>(Prisma.sql`
      SELECT
        u.id,
        u.name,
        u.avatar,
        u."shopName",
        u."sellerTitle",
        u."sellerBio",
        u."createdAt",
        COUNT(DISTINCT p.id)::int AS "productCount",
        CASE
          WHEN COUNT(r.id) = 0 THEN NULL
          ELSE ROUND(AVG(r.rating)::numeric, 1)::double precision
        END AS "averageRating",
        COUNT(r.id)::int AS "totalReviews"
      FROM "User" u
      LEFT JOIN "Product" p
        ON p."sellerId" = u.id
        AND p."deletedAt" IS NULL
        AND p.status = ${ProductStatus.APPROVED}::"ProductStatus"
      LEFT JOIN "Review" r ON r."productId" = p.id
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
        productCount: Number(row.productCount),
        averageRating: row.averageRating,
        totalReviews: Number(row.totalReviews),
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

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    let roles = user.roles;
    if (updateUserDto.roles) {
      roles = this.processRoles(updateUserDto.roles);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
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
    const [total, admins, sellers] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { roles: { has: 'ROLE_ADMIN' }, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { roles: { has: 'ROLE_SELLER' }, deletedAt: null },
      }),
    ]);
    const customers = total - sellers;

    return { total, admins, sellers, customers };
  }

  async addAddress(userId: string, createAddressDto: CreateAddressDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (createAddressDto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const addressCount = await this.prisma.address.count({
      where: { userId },
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
      where: { userId },
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
        where: { userId },
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
