import { UnauthorizedException } from '@nestjs/common';
import {
  describeErrorForObservability,
  emitObservabilityEvent,
  extractRequestIdFromHeaders,
} from './observability.util';

describe('observability.util', () => {
  it('emits structured log payload and redacts sensitive keys', () => {
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    emitObservabilityEvent(logger, 'warn', 'auth_login_failed', {
      requestId: 'req-1',
      password: 'secret-value',
      nested: {
        token: 'token-value',
      },
      reason: 'invalid_credentials',
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const serialized = logger.warn.mock.calls[0][0] as string;
    const payload = JSON.parse(serialized) as Record<string, unknown>;

    expect(payload.event).toBe('auth_login_failed');
    expect(payload.requestId).toBe('req-1');
    expect(payload.reason).toBe('invalid_credentials');
    expect(payload.password).toBe('[REDACTED]');
    expect((payload.nested as Record<string, unknown>).token).toBe(
      '[REDACTED]',
    );
    expect(typeof payload.timestamp).toBe('string');
  });

  it('extracts request id from supported headers', () => {
    expect(extractRequestIdFromHeaders({ 'x-request-id': 'req-a' })).toBe(
      'req-a',
    );
    expect(extractRequestIdFromHeaders({ 'X-Request-Id': 'req-b' })).toBe(
      'req-b',
    );
    expect(
      extractRequestIdFromHeaders({
        'x-request-id': ['req-c', 'req-d'],
      }),
    ).toBe('req-c');
  });

  it('describes http and unknown errors safely', () => {
    expect(
      describeErrorForObservability(new UnauthorizedException('Unauthorized')),
    ).toEqual({
      errorName: 'UnauthorizedException',
      statusCode: 401,
    });

    expect(describeErrorForObservability(new Error('failure'))).toEqual({
      errorName: 'Error',
    });

    expect(describeErrorForObservability('unexpected')).toEqual({
      errorName: 'UnknownError',
    });
  });

  it('redacts sensitive keys case-insensitively', () => {
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    emitObservabilityEvent(logger, 'warn', 'auth_refresh_failed', {
      Authorization: 'Bearer abc.def.ghi',
      PASSWORD: 'super-secret',
      RefreshToken: 'rt-123',
      nested: {
        COOKIE: 'auth_access_token=abcd',
      },
    });

    const serialized = logger.warn.mock.calls[0][0] as string;
    const payload = JSON.parse(serialized) as Record<string, unknown>;

    expect(payload.Authorization).toBe('[REDACTED]');
    expect(payload.PASSWORD).toBe('[REDACTED]');
    expect(payload.RefreshToken).toBe('[REDACTED]');
    expect((payload.nested as Record<string, unknown>).COOKIE).toBe(
      '[REDACTED]',
    );
  });

  it('redacts bearer token patterns in string values', () => {
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    emitObservabilityEvent(logger, 'warn', 'chat_socket_auth_failed', {
      reason: 'Authorization failed with Bearer abc123.def456.ghi789',
    });

    const serialized = logger.warn.mock.calls[0][0] as string;
    const payload = JSON.parse(serialized) as Record<string, unknown>;
    expect(payload.reason).toBe(
      'Authorization failed with Bearer [REDACTED]',
    );
  });

  it('does not throw on circular metadata', () => {
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const metadata: Record<string, unknown> = { name: 'circular-test' };
    metadata.self = metadata;

    expect(() =>
      emitObservabilityEvent(logger, 'warn', 'payment_webhook_failed', metadata),
    ).not.toThrow();

    const serialized = logger.warn.mock.calls[0][0] as string;
    const payload = JSON.parse(serialized) as Record<string, unknown>;
    expect(payload.self).toBe('[Circular]');
  });

  it('does not throw on bigint metadata and serializes safely', () => {
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    expect(() =>
      emitObservabilityEvent(logger, 'warn', 'payment_webhook_processed', {
        attempt: 2n,
      }),
    ).not.toThrow();

    const serialized = logger.warn.mock.calls[0][0] as string;
    const payload = JSON.parse(serialized) as Record<string, unknown>;
    expect(payload.attempt).toBe('2');
  });
});
