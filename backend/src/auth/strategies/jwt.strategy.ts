import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

const ACCESS_TOKEN_COOKIE = 'auth_access_token';

function extractJwtFromCookie(req?: Request): string | null {
  if (!req?.headers?.cookie) {
    return null;
  }

  const cookieEntries = req.headers.cookie.split(';');
  for (const entry of cookieEntries) {
    const [rawName, ...rawValueParts] = entry.trim().split('=');
    if (rawName !== ACCESS_TOKEN_COOKIE) {
      continue;
    }

    const rawValue = rawValueParts.join('=');
    return rawValue ? decodeURIComponent(rawValue) : null;
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractJwtFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, roles: user.roles };
  }
}
