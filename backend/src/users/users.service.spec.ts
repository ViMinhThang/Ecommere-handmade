import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    address: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    shopFollow: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user with default ROLE_USER', async () => {
      const dto = {
        name: 'Test',
        email: 'test@test.com',
        password: 'password123',
      };
      const createdUser = { id: '1', ...dto, roles: ['ROLE_USER'] };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(dto);

      const userCreateMock = mockPrismaService.user
        .create as jest.MockedFunction<
        (args: { data: { roles: string[] } }) => unknown
      >;
      const createCall = userCreateMock.mock.calls.at(-1)?.[0];
      expect(createCall?.data.roles).toEqual(['ROLE_USER']);
      expect(result.roles).toEqual(['ROLE_USER']);
    });

    it('should create a user with provided roles', async () => {
      const dto = {
        name: 'Test',
        email: 'test@test.com',
        password: 'password123',
        roles: ['ROLE_ADMIN'] as ('ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN')[],
      };
      const createdUser = {
        id: '1',
        ...dto,
        roles: ['ROLE_USER', 'ROLE_SELLER', 'ROLE_ADMIN'],
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(dto);

      expect(result.roles).toEqual(['ROLE_USER', 'ROLE_SELLER', 'ROLE_ADMIN']);
    });

    it('should reject create requests without explicit password', async () => {
      const dto = {
        name: 'Test',
        email: 'test@test.com',
      };

      await expect(
        service.create(dto as unknown as Parameters<UsersService['create']>[0]),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('totalPages');
    });

    it('should filter by role', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll('ROLE_ADMIN');

      const findManyMock = mockPrismaService.user
        .findMany as jest.MockedFunction<
        (args: { where: { roles: { has: string } } }) => unknown
      >;
      const findManyCall = findManyMock.mock.calls.at(-1)?.[0];
      expect(findManyCall?.where.roles).toEqual({ has: 'ROLE_ADMIN' });
    });
  });

  describe('findCustomersForSeller', () => {
    it('limits a seller without search to customers they already know', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findCustomersForSeller('seller-id', ['ROLE_SELLER'], {
        limit: 10,
      });

      const findManyCall =
        mockPrismaService.user.findMany.mock.calls.at(-1)?.[0];
      expect(findManyCall?.where).toMatchObject({
        deletedAt: null,
        status: 'ACTIVE',
        roles: { has: 'ROLE_USER' },
        AND: [
          {
            OR: [
              { customerConversations: { some: { sellerId: 'seller-id' } } },
              { customerCustomOrders: { some: { sellerId: 'seller-id' } } },
              {
                Order: {
                  some: { subOrders: { some: { sellerId: 'seller-id' } } },
                },
              },
            ],
          },
        ],
      });
    });

    it('keeps seller customer search scoped to customers they already know', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findCustomersForSeller('seller-id', ['ROLE_SELLER'], {
        q: 'linh',
      });

      const findManyCall =
        mockPrismaService.user.findMany.mock.calls.at(-1)?.[0];
      expect(findManyCall?.where.AND).toEqual([
        {
          OR: [
            { name: { contains: 'linh', mode: 'insensitive' } },
            { email: { contains: 'linh', mode: 'insensitive' } },
            { phone: { contains: 'linh', mode: 'insensitive' } },
          ],
        },
        {
          OR: [
            { customerConversations: { some: { sellerId: 'seller-id' } } },
            { customerCustomOrders: { some: { sellerId: 'seller-id' } } },
            {
              Order: {
                some: { subOrders: { some: { sellerId: 'seller-id' } } },
              },
            },
          ],
        },
      ]);
    });

    it('lets admins search all active customers without seller scoping', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findCustomersForSeller('admin-id', ['ROLE_ADMIN'], {
        q: 'linh',
      });

      const findManyCall =
        mockPrismaService.user.findMany.mock.calls.at(-1)?.[0];
      expect(findManyCall?.where.AND).toEqual([
        {
          OR: [
            { name: { contains: 'linh', mode: 'insensitive' } },
            { email: { contains: 'linh', mode: 'insensitive' } },
            { phone: { contains: 'linh', mode: 'insensitive' } },
          ],
        },
      ]);
      expect(JSON.stringify(findManyCall?.where)).not.toContain('seller-id');
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      const user = { id: '1', name: 'Test', email: 'test@test.com' };
      mockPrismaService.user.findFirst.mockResolvedValue(user);

      const result = await service.findOne('1');

      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('shop follows', () => {
    it('follows an active seller and returns current follow status', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'seller-id' });
      mockPrismaService.shopFollow.upsert.mockResolvedValue({
        id: 'follow-id',
      });
      mockPrismaService.shopFollow.count.mockResolvedValue(1);

      const result = await service.followShop(
        'customer-id',
        ['ROLE_USER'],
        'seller-id',
      );

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'seller-id',
          deletedAt: null,
          status: 'ACTIVE',
          roles: { has: 'ROLE_SELLER' },
          NOT: { roles: { has: 'ROLE_ADMIN' } },
        },
        select: { id: true },
      });
      expect(mockPrismaService.shopFollow.upsert).toHaveBeenCalledWith({
        where: {
          customerId_sellerId: {
            customerId: 'customer-id',
            sellerId: 'seller-id',
          },
        },
        update: {},
        create: {
          customerId: 'customer-id',
          sellerId: 'seller-id',
        },
      });
      expect(result).toEqual({
        sellerId: 'seller-id',
        isFollowing: true,
        followerCount: 1,
      });
    });

    it('keeps duplicate follow requests idempotent through upsert', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'seller-id' });
      mockPrismaService.shopFollow.upsert.mockResolvedValue({
        id: 'existing-follow-id',
      });
      mockPrismaService.shopFollow.count.mockResolvedValue(1);

      await service.followShop('customer-id', ['ROLE_USER'], 'seller-id');

      expect(mockPrismaService.shopFollow.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {},
          create: {
            customerId: 'customer-id',
            sellerId: 'seller-id',
          },
        }),
      );
    });

    it('unfollows with deleteMany and does not require an existing follow row', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'seller-id' });
      mockPrismaService.shopFollow.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.shopFollow.count.mockResolvedValue(0);

      const result = await service.unfollowShop(
        'customer-id',
        ['ROLE_USER'],
        'seller-id',
      );

      expect(mockPrismaService.shopFollow.deleteMany).toHaveBeenCalledWith({
        where: {
          customerId: 'customer-id',
          sellerId: 'seller-id',
        },
      });
      expect(result).toEqual({
        sellerId: 'seller-id',
        isFollowing: false,
        followerCount: 0,
      });
    });

    it('rejects self-follow attempts before touching the database', async () => {
      await expect(
        service.followShop('seller-id', ['ROLE_USER'], 'seller-id'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.shopFollow.upsert).not.toHaveBeenCalled();
    });

    it('rejects follow attempts from accounts without customer role', async () => {
      await expect(
        service.followShop('admin-id', ['ROLE_ADMIN'], 'seller-id'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
    });

    it('rejects non-seller, inactive, or deleted follow targets', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.followShop('customer-id', ['ROLE_USER'], 'bad-target-id'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.shopFollow.upsert).not.toHaveBeenCalled();
    });

    it('lists only shops followed by the current user', async () => {
      mockPrismaService.shopFollow.findMany.mockResolvedValue([]);

      await service.listFollowedShops('customer-id', ['ROLE_USER']);

      expect(mockPrismaService.shopFollow.findMany).toHaveBeenCalledWith({
        where: {
          customerId: 'customer-id',
          seller: {
            deletedAt: null,
            status: 'ACTIVE',
            roles: { has: 'ROLE_SELLER' },
            NOT: { roles: { has: 'ROLE_ADMIN' } },
          },
        },
        include: {
          seller: {
            select: expect.any(Object),
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const user = { id: '1', email: 'test@test.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(user);
    });
  });

  describe('updateProfile', () => {
    it('should ignore privileged fields from self-service profile updates', async () => {
      const user = {
        id: '1',
        name: 'Old',
        email: 'test@test.com',
        roles: ['ROLE_USER'],
      };
      const updatedUser = { ...user, name: 'New' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const maliciousProfileUpdate = {
        name: 'New',
        roles: ['ROLE_ADMIN'],
        status: 'SUSPENDED',
        password: 'new-password',
        isEmailVerified: true,
        artisanVerified: true,
        verificationNote: 'self-approved',
        shopReturnPolicy: 'Không nên ghi',
        shopShippingPolicy: 'Không nên ghi',
        shopProcessingTime: 'Không nên ghi',
      } as unknown as UpdateProfileDto;

      await service.updateProfile('1', maliciousProfileUpdate);

      const userUpdateMock = mockPrismaService.user
        .update as jest.MockedFunction<
        (args: { data: Record<string, unknown> }) => unknown
      >;
      const updateCall = userUpdateMock.mock.calls.at(-1)?.[0];
      const data = updateCall?.data ?? {};
      expect(data).toHaveProperty('name', 'New');
      expect(data).not.toHaveProperty('roles');
      expect(data).not.toHaveProperty('status');
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('isEmailVerified');
      expect(data).not.toHaveProperty('artisanVerified');
      expect(data).not.toHaveProperty('verificationNote');
      expect(data).not.toHaveProperty('shopReturnPolicy');
      expect(data).not.toHaveProperty('shopShippingPolicy');
      expect(data).not.toHaveProperty('shopProcessingTime');
    });

    it('should allow sellers to update craft profile fields', async () => {
      const user = {
        id: '1',
        name: 'Old',
        email: 'test@test.com',
        roles: ['ROLE_USER', 'ROLE_SELLER'],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);

      await service.updateProfile('1', {
        craftSpecialty: 'Gốm thủ công',
        craftExperienceYears: 5,
        craftMaterials: ['Đất sét', 'Men tro'],
      });

      const updateCall = mockPrismaService.user.update.mock.calls.at(-1)?.[0];
      expect(updateCall?.data).toMatchObject({
        craftSpecialty: 'Gốm thủ công',
        craftExperienceYears: 5,
        craftMaterials: ['Đất sét', 'Men tro'],
      });
    });
    it('should allow sellers to update shop policy fields', async () => {
      const user = {
        id: 'seller-1',
        name: 'Seller',
        email: 'seller@test.com',
        roles: ['ROLE_USER', 'ROLE_SELLER'],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);

      await service.updateProfile('seller-1', {
        shopProcessingTime: ' 2-4 ngày làm việc ',
        shopShippingPolicy: ' Gửi GHN/GHTK và cập nhật mã vận đơn. ',
        shopReturnPolicy: '',
      });

      const updateCall = mockPrismaService.user.update.mock.calls.at(-1)?.[0];
      expect(updateCall?.data).toMatchObject({
        shopProcessingTime: '2-4 ngày làm việc',
        shopShippingPolicy: 'Gửi GHN/GHTK và cập nhật mã vận đơn.',
        shopReturnPolicy: null,
      });
      expect(updateCall?.data).toHaveProperty('shopPolicyUpdatedAt');
    });
  });

  describe('update', () => {
    it('lets admins verify seller artisan profiles', async () => {
      const seller = {
        id: 'seller-id',
        roles: ['ROLE_USER', 'ROLE_SELLER'],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(seller);
      mockPrismaService.user.update.mockResolvedValue({
        ...seller,
        artisanVerified: true,
      });

      await service.update('seller-id', {
        artisanVerified: true,
        verificationNote: 'Đã kiểm tra hồ sơ nghệ nhân',
      });

      const updateCall = mockPrismaService.user.update.mock.calls.at(-1)?.[0];
      expect(updateCall?.data).toMatchObject({
        artisanVerified: true,
        verificationNote: 'Đã kiểm tra hồ sơ nghệ nhân',
        roles: ['ROLE_USER', 'ROLE_SELLER'],
      });
    });

    it('rejects artisan verification for non-seller accounts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'customer-id',
        roles: ['ROLE_USER'],
      });

      await expect(
        service.update('customer-id', { artisanVerified: true }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('requires the current password and stores a fresh hash', async () => {
      const currentPassword = 'Secure123!';
      const newPassword = 'Stronger123!';
      const oldHash = await bcrypt.hash(currentPassword, 4);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        password: oldHash,
      });
      mockPrismaService.user.update.mockResolvedValue({ id: '1' });

      await expect(
        service.changePassword('1', { currentPassword, newPassword }),
      ).resolves.toEqual({ success: true });

      const updateCall = mockPrismaService.user.update.mock.calls.at(-1)?.[0];
      expect(updateCall?.where).toEqual({ id: '1' });
      expect(updateCall?.data.password).not.toBe(oldHash);
      await expect(
        bcrypt.compare(newPassword, updateCall?.data.password),
      ).resolves.toBe(true);
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: '1', revoked: false },
        data: { revoked: true },
      });
    });

    it('rejects an invalid current password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        password: await bcrypt.hash('Secure123!', 4),
      });

      await expect(
        service.changePassword('1', {
          currentPassword: 'Wrong123!',
          newPassword: 'Stronger123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects reusing the same password', async () => {
      const currentPassword = 'Secure123!';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        password: await bcrypt.hash(currentPassword, 4),
      });

      await expect(
        service.changePassword('1', {
          currentPassword,
          newPassword: currentPassword,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
