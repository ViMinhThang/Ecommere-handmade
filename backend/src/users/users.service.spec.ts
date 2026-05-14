import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
      const user = { id: '1', name: 'Old', email: 'test@test.com' };
      const updatedUser = { ...user, name: 'New' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const maliciousProfileUpdate = {
        name: 'New',
        roles: ['ROLE_ADMIN'],
        status: 'SUSPENDED',
        password: 'new-password',
        isEmailVerified: true,
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
