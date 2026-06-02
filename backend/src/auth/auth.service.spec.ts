import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from './mailer/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let mailerService: jest.Mocked<MailerService>;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed_password',
    roles: ['ROLE_USER'],
    status: UserStatus.ACTIVE,
    isEmailVerified: false,
    avatar: null,
    phone: null,
    shopName: null,
    otpCode: null,
    otpExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      updateOtpFields: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockMailerService = {
      sendOtpEmail: jest.fn(),
    };

    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailerService, useValue: mockMailerService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    mailerService = module.get(MailerService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and send OTP', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        ...mockUser,
        id: 'new-user-1',
        email: registerDto.email,
        name: registerDto.name,
      } as any);
      usersService.updateOtpFields.mockResolvedValue(undefined);
      mailerService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('email', registerDto.email);
      expect(usersService.create).toHaveBeenCalledWith({
        ...registerDto,
        roles: ['ROLE_USER'],
      });
      expect(usersService.updateOtpFields).toHaveBeenCalled();
      expect(mailerService.sendOtpEmail).toHaveBeenCalled();
    });

    it('should resend OTP if email exists but not verified', async () => {
      const existingUser = {
        ...mockUser,
        isEmailVerified: false,
      };

      usersService.findByEmail.mockResolvedValue(existingUser as any);
      usersService.updateOtpFields.mockResolvedValue(undefined);
      mailerService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await service.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'User',
      });

      expect(result.message).toContain('verification code');
      expect(usersService.updateOtpFields).toHaveBeenCalled();
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already verified', async () => {
      const verifiedUser = {
        ...mockUser,
        isEmailVerified: true,
      };

      usersService.findByEmail.mockResolvedValue(verifiedUser as any);

      await expect(
        service.register({
          email: 'verified@example.com',
          password: 'password123',
          name: 'User',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and mark email as verified', async () => {
      const otpUser = {
        ...mockUser,
        id: 'user-1',
        otpCode: 'hashed_123456',
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        isEmailVerified: false,
      };

      usersService.findByEmail.mockResolvedValue(otpUser as any);
      usersService.updateOtpFields.mockResolvedValue(undefined);

      // Mock hash to match stored hash
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHash').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed_123456'),
      });

      const result = await service.verifyOtp('test@example.com', '123456');

      expect(result).toEqual({
        message: 'Email verified successfully',
      });
      expect(usersService.updateOtpFields).toHaveBeenCalledWith('user-1', {
        isEmailVerified: true,
        otpCode: null,
        otpExpires: null,
      });
    });

    it('should throw UnauthorizedException if OTP is invalid', async () => {
      const otpUser = {
        ...mockUser,
        otpCode: 'hashed_123456',
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        isEmailVerified: false,
      };

      usersService.findByEmail.mockResolvedValue(otpUser as any);

      await expect(
        service.verifyOtp('test@example.com', '999999'),
      ).rejects.toThrow();
    });

    it('should throw UnauthorizedException if OTP is expired', async () => {
      const otpUser = {
        ...mockUser,
        otpCode: 'hashed_123456',
        otpExpires: new Date(Date.now() - 1000), // Expired
        isEmailVerified: false,
      };

      usersService.findByEmail.mockResolvedValue(otpUser as any);

      await expect(
        service.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow();
    });

    it('should throw NotFoundException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.verifyOtp('nonexistent@example.com', '123456'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const verifiedUser = {
        ...mockUser,
        isEmailVerified: true,
        deletedAt: null,
        status: UserStatus.ACTIVE,
      };

      usersService.findByEmail.mockResolvedValue(verifiedUser as any);
      jwtService.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');
      prisma.refreshToken.create.mockResolvedValue({
        id: 'token-1',
        userId: verifiedUser.id,
        token: 'hashed_refresh_token',
        expiresAt: new Date(),
      } as any);

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result).toHaveProperty('user');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        service.login('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const verifiedUser = {
        ...mockUser,
        isEmailVerified: true,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      };

      usersService.findByEmail.mockResolvedValue(verifiedUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login('test@example.com', 'wrong_password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('nonexistent@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        isEmailVerified: true,
        deletedAt: null,
      };

      usersService.findByEmail.mockResolvedValue(inactiveUser as any);

      await expect(
        service.login('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshTokenRecord = {
        id: 'token-1',
        userId: 'user-1',
        token: 'hashed_refresh_token',
        expiresAt: new Date(Date.now() + 10000),
        user: {
          ...mockUser,
          isEmailVerified: true,
        },
      };

      prisma.refreshToken.findUnique.mockResolvedValue(refreshTokenRecord as any);
      jwtService.sign.mockReturnValue('new_access_token');

      const result = await service.refreshToken('refresh_token');

      expect(result).toHaveProperty('accessToken', 'new_access_token');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException if refresh token not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      const expiredToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'hashed_refresh_token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: mockUser,
      };

      prisma.refreshToken.findUnique.mockResolvedValue(expiredToken as any);

      await expect(service.refreshToken('expired_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should logout user by deleting refresh token', async () => {
      prisma.refreshToken.delete.mockResolvedValue({
        id: 'token-1',
      } as any);

      const result = await service.logout('refresh_token');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
    });

    it('should return success even if token not found', async () => {
      prisma.refreshToken.delete.mockRejectedValue(new Error('Not found'));

      const result = await service.logout('invalid_token');

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('forgotPassword', () => {
    it('should send OTP for password reset', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.updateOtpFields.mockResolvedValue(undefined);
      mailerService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@example.com');

      expect(result).toEqual({
        message: 'If the email exists, an OTP will be sent',
      });
      expect(usersService.updateOtpFields).toHaveBeenCalled();
      expect(mailerService.sendOtpEmail).toHaveBeenCalled();
    });

    it('should return success message even if user not found (security)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result).toEqual({
        message: 'If the email exists, an OTP will be sent',
      });
      expect(usersService.updateOtpFields).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid OTP', async () => {
      const otpUser = {
        ...mockUser,
        otpCode: '123456',
        otpExpiration: new Date(Date.now() + 10 * 60 * 1000),
      };

      prisma.user.findUnique.mockResolvedValue(otpUser as any);
      prisma.user.update.mockResolvedValue({
        ...otpUser,
        password: 'new_hashed_password',
        otpCode: null,
        otpExpiration: null,
      } as any);

      const result = await service.resetPassword(
        'test@example.com',
        '123456',
        'new_password',
      );

      expect(result).toEqual({
        message: 'Password reset successfully',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('new_password', expect.any(Number));
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if OTP is invalid', async () => {
      const otpUser = {
        ...mockUser,
        otpCode: '123456',
        otpExpiration: new Date(Date.now() + 10 * 60 * 1000),
      };

      prisma.user.findUnique.mockResolvedValue(otpUser as any);

      await expect(
        service.resetPassword('test@example.com', '999999', 'new_password'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      const otpUser = {
        ...mockUser,
        otpCode: '123456',
        otpExpiration: new Date(Date.now() - 1000),
      };

      prisma.user.findUnique.mockResolvedValue(otpUser as any);

      await expect(
        service.resetPassword('test@example.com', '123456', 'new_password'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
