import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const authService = {
    refreshToken: jest.fn(),
  } as unknown as jest.Mocked<Pick<AuthService, 'refreshToken'>>;
  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as AuthService);
  });

  it('refreshes with a body refresh token', async () => {
    authService.refreshToken.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    await controller.refresh('body-token', { headers: {} } as Request);

    expect(authService.refreshToken).toHaveBeenCalledWith('body-token');
  });

  it('refreshes with the httpOnly cookie token when body is empty', async () => {
    authService.refreshToken.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    await controller.refresh(undefined, {
      headers: { cookie: 'auth_refresh_token=cookie-token' },
    } as Request);

    expect(authService.refreshToken).toHaveBeenCalledWith('cookie-token');
  });

  it('rejects refresh without any token source', async () => {
    await expect(
      controller.refresh(undefined, { headers: {} } as Request),
    ).rejects.toThrow(UnauthorizedException);
  });
});
