import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';

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

  beforeEach(async () => {
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
    it('should return a user by id', async () => {
      const user = { id: '1', name: 'Test', email: 'test@test.com' };
      mockUsersService.findOne.mockResolvedValue(user);

      const result = await controller.findOne('1');

      expect(mockUsersService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(user);
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
