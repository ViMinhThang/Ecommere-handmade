import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt, createHash, randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from './mailer/mailer.service';

const OTP_MIN = 100000;
const OTP_MAX = 999999;
const OTP_EXPIRATION_MS = 10 * 60 * 1000;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const ACCESS_TOKEN_EXPIRY = '30d';
const REFRESH_TOKEN_EXPIRY = '30d';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  roles: string[];
  avatar: string | null;
  phone: string | null;
  shopName: string | null;
  isEmailVerified: boolean;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface GoogleProfile {
  email: string;
  name: string;
  avatar: string | null;
}

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private prisma: PrismaService,
  ) {}

  private generateOtp(): string {
    return randomInt(OTP_MIN, OTP_MAX + 1).toString();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getOtpExpiration(): Date {
    return new Date(Date.now() + OTP_EXPIRATION_MS);
  }

  private getGoogleClientIds(): string[] {
    const configuredClientIds = process.env.GOOGLE_CLIENT_ID;
    if (!configuredClientIds) {
      throw new InternalServerErrorException('Google login is not configured');
    }

    const clientIds = configuredClientIds
      .split(',')
      .map((clientId) => clientId.trim())
      .filter(Boolean);

    if (clientIds.length === 0) {
      throw new InternalServerErrorException('Google login is not configured');
    }

    return clientIds;
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.getGoogleClientIds(),
      });
      const payload = ticket.getPayload();

      if (!payload?.email || payload.email_verified !== true) {
        throw new UnauthorizedException('Google account email is not verified');
      }

      return {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture || null,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async createTokenPair(user: AuthUserRecord): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private formatAuthResponse(user: AuthUserRecord, tokens: TokenPair) {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        avatar: user.avatar,
        phone: user.phone,
        shopName: user.shopName,
      },
    };
  }

  private validateOtp(
    user: {
      otpCode: string | null;
      otpExpires: Date | null;
      isEmailVerified: boolean;
    },
    otpCode: string,
  ) {
    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }
    if (!user.otpCode) {
      throw new UnauthorizedException('Invalid OTP code');
    }
    const hashedOtp = this.hashToken(otpCode);
    if (user.otpCode !== hashedOtp) {
      throw new UnauthorizedException('Invalid OTP code');
    }
    if (user.otpExpires && new Date() > user.otpExpires) {
      throw new UnauthorizedException('OTP code has expired');
    }
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new BadRequestException('Email already registered');
      }

      const otpCode = this.generateOtp();
      const otpExpires = this.getOtpExpiration();

      await this.usersService.updateOtpFields(existingUser.id, {
        otpCode: this.hashToken(otpCode),
        otpExpires,
      });

      await this.mailerService.sendOtpEmail(
        existingUser.email,
        otpCode,
        'register',
      );

      return {
        message: 'A new verification code has been sent to your email.',
        email: existingUser.email,
      };
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      BCRYPT_ROUNDS,
    );
    const otpCode = this.generateOtp();
    const otpExpires = this.getOtpExpiration();

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      roles: ['ROLE_USER'],
    });

    await this.usersService.updateOtpFields(user.id, {
      otpCode: this.hashToken(otpCode),
      otpExpires,
    });

    await this.mailerService.sendOtpEmail(user.email, otpCode, 'register');

    return {
      message:
        'Registration successful. Please verify your email with the OTP sent to your email.',
      email: user.email,
    };
  }

  async verifyOtp(email: string, otpCode: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.validateOtp(user, otpCode);

    await this.usersService.updateOtpFields(user.id, {
      isEmailVerified: true,
      otpCode: null,
      otpExpires: null,
    });

    return { message: 'Email verified successfully' };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.createTokenPair(user as AuthUserRecord);
    return this.formatAuthResponse(user as AuthUserRecord, tokens);
  }

  async loginWithGoogle(idToken: string) {
    const googleProfile = await this.verifyGoogleIdToken(idToken);
    let user = await this.usersService.findByEmail(googleProfile.email);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleProfile.email,
          name: googleProfile.name,
          avatar: googleProfile.avatar,
          password: await bcrypt.hash(
            randomBytes(48).toString('hex'),
            BCRYPT_ROUNDS,
          ),
          roles: ['ROLE_USER'],
          isEmailVerified: true,
        },
      });
    } else {
      const updateData: {
        isEmailVerified?: boolean;
        name?: string;
        avatar?: string | null;
      } = {};

      if (!user.isEmailVerified) {
        updateData.isEmailVerified = true;
      }
      if (googleProfile.name && googleProfile.name !== user.name) {
        updateData.name = googleProfile.name;
      }
      if (googleProfile.avatar && googleProfile.avatar !== user.avatar) {
        updateData.avatar = googleProfile.avatar;
      }

      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    const tokens = await this.createTokenPair(user as AuthUserRecord);
    return this.formatAuthResponse(user as AuthUserRecord, tokens);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const otpCode = this.generateOtp();
      const otpExpires = this.getOtpExpiration();

      await this.usersService.updateOtpFields(user.id, {
        otpCode: this.hashToken(otpCode),
        otpExpires,
      });

      await this.mailerService.sendOtpEmail(email, otpCode, 'forgot');
    }

    return { message: 'If the email exists, an OTP will be sent' };
  }

  async resetPassword(email: string, otpCode: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.validateOtp(user, otpCode);

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.usersService.updateOtpFields(user.id, {
      password: hashedPassword,
      otpCode: null,
      otpExpires: null,
    });

    return { message: 'Password reset successfully' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);
      const hashedToken = this.hashToken(refreshToken);

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: hashedToken },
      });

      if (
        !storedToken ||
        storedToken.revoked ||
        storedToken.expiresAt < new Date()
      ) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const newAccessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
          roles: payload.roles,
        },
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      );

      const newRefreshToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
          roles: payload.roles,
        },
        { expiresIn: REFRESH_TOKEN_EXPIRY },
      );

      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 30);

      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revoked: true,
          replacedByToken: this.hashToken(newRefreshToken),
        },
      });

      await this.prisma.refreshToken.create({
        data: {
          userId: payload.sub,
          token: this.hashToken(newRefreshToken),
          expiresAt: newExpiresAt,
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateUser(userId: string) {
    return this.usersService.findOne(userId);
  }
}
