import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
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
