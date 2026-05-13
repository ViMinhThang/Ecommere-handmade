import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
    getAddresses: jest.fn(),
    addAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
  };

  const mockPrismaService = {};

  const createRequest = (
    userId: string,
    roles: string[] = ['ROLE_USER'],
  ): AuthenticatedRequest =>
    ({
      user: {
        id: userId,
        email: `${userId}@example.com`,
        roles,
      },
    }) as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = {
        name: 'Test',
        email: 'test@test.com',
        password: 'password123',
      };
      mockUsersService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...dto,
        isEmailVerified: true,
      });
      expect(result.id).toBe('1');
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const result = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      mockUsersService.findAll.mockResolvedValue(result);

      const query = {};

      const response = await controller.findAll(query);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        query,
      );
      expect(response).toEqual(result);
    });
  });

  describe('findOne', () => {
    it('should allow owner to fetch their own profile', async () => {
      const user = { id: '1', name: 'Test', email: 'test@test.com' };
      mockUsersService.findOne.mockResolvedValue(user);
      const request = createRequest('1');

      const result = await controller.findOne(request, '1');

      expect(mockUsersService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(user);
    });

    it('should allow admin to fetch another user profile', async () => {
      const user = { id: '2', name: 'User2', email: 'user2@test.com' };
      mockUsersService.findOne.mockResolvedValue(user);
      const request = createRequest('admin-id', ['ROLE_ADMIN']);

      const result = await controller.findOne(request, '2');

      expect(mockUsersService.findOne).toHaveBeenCalledWith('2');
      expect(result).toEqual(user);
    });

    it('should deny non-admin user from fetching another user profile', async () => {
      const request = createRequest('1');

      expect(() => controller.findOne(request, '2')).toThrow(ForbiddenException);
      expect(mockUsersService.findOne).not.toHaveBeenCalled();
    });

    it('should preserve 404 behavior when owner requests non-existent user', async () => {
      const request = createRequest('missing-user');
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.findOne(request, 'missing-user')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith('missing-user');
    });
  });

  describe('getMe', () => {
    it('should return current user profile and keep /users/me behavior', async () => {
      const request = createRequest('me-id');
      const me = { id: 'me-id', email: 'me@test.com' };
      mockUsersService.findOne.mockResolvedValue(me);

      const result = await controller.getMe(request);

      expect(mockUsersService.findOne).toHaveBeenCalledWith('me-id');
      expect(result).toEqual(me);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      mockUsersService.remove.mockResolvedValue({ id: '1' });

      const result = await controller.remove('1');

      expect(mockUsersService.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1' });
    });
  });
});
