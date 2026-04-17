import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roles: ['ROLE_USER'] }),
        }),
      );
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

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roles: { has: 'ROLE_ADMIN' },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      const user = { id: '1', name: 'Test', email: 'test@test.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('1');

      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

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

  describe('remove', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
