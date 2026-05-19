import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import {
  describeErrorForObservability,
  emitObservabilityEvent,
  extractRequestIdFromHeaders,
} from '../common/observability/observability.util';

const REFRESH_TOKEN_COOKIE = 'auth_refresh_token';

function extractCookieValue(
  req: ExpressRequest,
  key: string,
): string | undefined {
  if (!req.headers.cookie) {
    return undefined;
  }

  const cookieEntries = req.headers.cookie.split(';');
  for (const entry of cookieEntries) {
    const [rawName, ...rawValueParts] = entry.trim().split('=');
    if (rawName !== key) {
      continue;
    }

    const rawValue = rawValueParts.join('=');
    return rawValue ? decodeURIComponent(rawValue) : undefined;
  }

  return undefined;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(@Body() registerDto: RegisterDto, @Req() req: ExpressRequest) {
    try {
      return await this.authService.register(registerDto);
    } catch (error) {
      emitObservabilityEvent(this.logger, 'warn', 'auth_register_failed', {
        requestId: extractRequestIdFromHeaders(
          req.headers as Record<string, unknown>,
        ),
        hasEmail: Boolean(registerDto.email),
        ...describeErrorForObservability(error),
      });
      throw error;
    }
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto.email, verifyOtpDto.otpCode);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: ExpressRequest) {
    try {
      return await this.authService.login(loginDto.email, loginDto.password);
    } catch (error) {
      emitObservabilityEvent(this.logger, 'warn', 'auth_login_failed', {
        requestId: extractRequestIdFromHeaders(
          req.headers as Record<string, unknown>,
        ),
        hasEmail: Boolean(loginDto.email),
        ...describeErrorForObservability(error),
      });
      throw error;
    }
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(googleLoginDto.idToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.otpCode,
      resetPasswordDto.newPassword,
    );
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body('refreshToken') refreshToken: string | undefined,
    @Req() req: ExpressRequest,
  ) {
    const requestId = extractRequestIdFromHeaders(
      req.headers as Record<string, unknown>,
    );
    const cookieToken = extractCookieValue(req, REFRESH_TOKEN_COOKIE);
    const resolvedToken = refreshToken || cookieToken;

    if (!resolvedToken) {
      emitObservabilityEvent(this.logger, 'warn', 'auth_refresh_failed', {
        requestId,
        credentialSource: 'missing',
        errorName: UnauthorizedException.name,
        statusCode: HttpStatus.UNAUTHORIZED,
      });
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      return await this.authService.refreshToken(resolvedToken);
    } catch (error) {
      emitObservabilityEvent(this.logger, 'warn', 'auth_refresh_failed', {
        requestId,
        credentialSource: refreshToken ? 'body' : 'cookie',
        ...describeErrorForObservability(error),
      });
      throw error;
    }
  }

  @Post('logout')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body('refreshToken') refreshToken: string | undefined,
    @Req() req: ExpressRequest,
  ) {
    const cookieToken = extractCookieValue(req, REFRESH_TOKEN_COOKIE);
    return this.authService.logout(refreshToken || cookieToken);
  }
}
