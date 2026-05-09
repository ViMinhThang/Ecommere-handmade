import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

const ACCESS_TOKEN_COOKIE = 'auth_access_token';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<Request>();
    if ((err || info) && this.hasAuthCredential(request)) {
      return null as TUser;
    }

    return (user ?? null) as TUser;
  }

  private hasAuthCredential(request: Request) {
    return Boolean(
      request.headers.authorization ||
      request.headers.cookie?.includes(`${ACCESS_TOKEN_COOKIE}=`),
    );
  }
}
