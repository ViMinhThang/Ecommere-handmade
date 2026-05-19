import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  const guard = new OptionalJwtAuthGuard();

  const contextFor = (request: Partial<Request>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it('allows anonymous requests when no token is provided', () => {
    const context = contextFor({ headers: {} });

    expect(guard.handleRequest(null, null, null, context)).toBeNull();
  });

  it('returns the authenticated user when a valid token is provided', () => {
    const user = { id: 'user-1' };
    const context = contextFor({
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(guard.handleRequest(null, user, null, context)).toBe(user);
  });

  it('rejects invalid authorization headers instead of treating them as anonymous', () => {
    const context = contextFor({
      headers: { authorization: 'Bearer invalid-token' },
    });

    expect(() =>
      guard.handleRequest(null, null, new Error('jwt malformed'), context),
    ).toThrow(UnauthorizedException);
  });

  it('rejects invalid auth cookies instead of treating them as anonymous', () => {
    const context = contextFor({
      headers: { cookie: 'auth_access_token=expired-token' },
    });

    expect(() =>
      guard.handleRequest(null, null, new Error('jwt expired'), context),
    ).toThrow(UnauthorizedException);
  });
});
