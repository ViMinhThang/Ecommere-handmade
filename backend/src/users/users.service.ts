import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private processRoles(roles?: ('ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN')[]): ('ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN')[] {
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
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        roles,
      },
      include: {
        addresses: true,
      },
    });
  }

  async findAll(role?: string, status?: string) {
    const where: any = {};
    if (role) {
      where.roles = { has: role.toUpperCase() };
    }
    if (status) where.status = status.toUpperCase();

    return this.prisma.user.findMany({ 
      where,
      include: { addresses: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      include: { addresses: true },
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
      include: { addresses: true },
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
    const total = await this.prisma.user.count();
    const admins = await this.prisma.user.count({ where: { roles: { has: 'ROLE_ADMIN' } } });
    const sellers = await this.prisma.user.count({ where: { roles: { has: 'ROLE_SELLER' } } });
    const customers = total - sellers;

    return { total, admins, sellers, customers };
  }

  // Address methods
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

  async updateAddress(userId: string, addressId: string, updateAddressDto: Partial<CreateAddressDto>) {
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
}
