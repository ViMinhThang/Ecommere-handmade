import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from './mailer/mailer.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpExpiration(): Date {
    return new Date(Date.now() + 10 * 60 * 1000);
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new BadRequestException('Email already registered');
      }
      
      const otpCode = this.generateOtp();
      const otpExpires = this.getOtpExpiration();
      
      await this.usersService.update(existingUser.id, {
        otpCode,
        otpExpires,
      });
      
      await this.mailerService.sendOtpEmail(existingUser.email, otpCode, 'register');
      
      return {
        message: 'A new verification code has been sent to your email.',
        email: existingUser.email,
      };
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const otpCode = this.generateOtp();
    const otpExpires = this.getOtpExpiration();

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      otpCode,
      otpExpires,
      roles: ['ROLE_USER'],
    });

    await this.mailerService.sendOtpEmail(user.email, otpCode, 'register');

    return {
      message: 'Registration successful. Please verify your email with the OTP sent to your email.',
      email: user.email,
    };
  }

  async verifyOtp(email: string, otpCode: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (!user.otpCode || user.otpCode !== otpCode) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (user.otpExpires && new Date() > user.otpExpires) {
      throw new UnauthorizedException('OTP code has expired');
    }

    await this.usersService.update(user.id, {
      isEmailVerified: true,
      otpCode: undefined,
      otpExpires: undefined,
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

    const payload = { sub: user.id, email: user.email, roles: user.roles };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
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

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If the email exists, an OTP will be sent' };
    }

    const otpCode = this.generateOtp();
    const otpExpires = this.getOtpExpiration();

    await this.usersService.update(user.id, {
      otpCode,
      otpExpires,
    });

    await this.mailerService.sendOtpEmail(email, otpCode, 'forgot');

    return { message: 'If the email exists, an OTP will be sent' };
  }

  async resetPassword(email: string, otpCode: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.otpCode || user.otpCode !== otpCode) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (user.otpExpires && new Date() > user.otpExpires) {
      throw new UnauthorizedException('OTP code has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      otpCode: undefined,
      otpExpires: undefined,
    });

    return { message: 'Password reset successfully' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      const newAccessToken = this.jwtService.sign({
        sub: payload.sub,
        email: payload.email,
        roles: payload.roles,
      }, { expiresIn: '15m' });

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateUser(userId: string) {
    return this.usersService.findOne(userId);
  }
}
