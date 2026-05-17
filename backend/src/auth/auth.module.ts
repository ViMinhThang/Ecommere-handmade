import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { MailerModule } from './mailer/mailer.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  DEFAULT_ACCESS_TOKEN_EXPIRY,
  normalizeJwtExpiry,
} from './auth-token-expiry';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: normalizeJwtExpiry(
            configService.get<string>('JWT_EXPIRES_IN'),
            DEFAULT_ACCESS_TOKEN_EXPIRY,
          ),
        },
      }),
      inject: [ConfigService],
    }),
    MailerModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
