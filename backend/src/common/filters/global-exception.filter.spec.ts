import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns 400 with safe validation errors', () => {
    const { host, status, json } = createHttpHost();
    const exception = new BadRequestException({
      message: ['email must be an email'],
      error: 'Bad Request',
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    const payload = json.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      statusCode: 400,
      message: 'email must be an email',
      error: 'Bad Request',
      path: '/test',
      requestId: 'req-1',
    });
    expect(payload.errors).toEqual(['email must be an email']);
    expect(payload).not.toHaveProperty('stack');
  });

  it('returns 404 for NotFoundException with safe message', () => {
    const { host, status, json } = createHttpHost();
    const exception = new NotFoundException('Product not found');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    const payload = json.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      statusCode: 404,
      message: 'Product not found',
      error: 'Not Found',
    });
  });

  it('maps Prisma P2002 to 409 Conflict with safe message', () => {
    const { host, status, json } = createHttpHost();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`email`)',
      {
        code: 'P2002',
        clientVersion: 'test',
      },
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(409);
    const payload = json.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      statusCode: 409,
      message: 'A record with the same unique value already exists',
      error: 'Conflict',
    });
    expect(String(payload.message)).not.toContain('Unique constraint failed');
  });

  it('maps Prisma P2025 to 404 Not Found', () => {
    const { host, status, json } = createHttpHost();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Record to update not found',
      {
        code: 'P2025',
        clientVersion: 'test',
      },
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    const payload = json.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      statusCode: 404,
      message: 'Requested resource was not found',
      error: 'Not Found',
    });
  });

  it('maps Prisma input errors to 400 Bad Request', () => {
    const { host, status, json } = createHttpHost();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Missing required value',
      {
        code: 'P2012',
        clientVersion: 'test',
      },
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    const payload = json.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      statusCode: 400,
      message: 'Invalid request data',
      error: 'Bad Request',
    });
  });

  it('returns generic 500 for unknown Prisma errors without leaking internals', () => {
    const { host, status, json } = createHttpHost();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'DB engine error password=secret',
      {
        code: 'P9999',
        clientVersion: 'test',
      },
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(500);
    const payload = json.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
    expect(JSON.stringify(payload)).not.toContain('password=secret');
    expect(JSON.stringify(payload)).not.toContain('P9999');
  });

  it('does not include stack traces in production responses', () => {
    process.env.NODE_ENV = 'production';
    const { host, status, json } = createHttpHost();
    const exception = new Error('Internal failure');
    exception.stack = 'stack details';

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(500);
    const payload = json.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('stack');
    expect(JSON.stringify(payload)).not.toContain('stack details');
  });

  it('keeps development responses free from secret/token/password leakage', () => {
    process.env.NODE_ENV = 'development';
    const { host, status, json } = createHttpHost();
    const exception = new Error(
      'token=abcd password=1234 secret=very-secret-value',
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(500);
    const payload = json.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.message).toBe('Internal server error');
    const serialized = JSON.stringify(payload).toLowerCase();
    expect(serialized).not.toContain('token=');
    expect(serialized).not.toContain('password=');
    expect(serialized).not.toContain('secret=');
  });
});

function createHttpHost() {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const response = {
    status,
    json,
    getHeader: jest.fn((name: string) =>
      name === 'x-request-id' ? 'req-1' : undefined,
    ),
  } as unknown as Response;

  const request = {
    method: 'GET',
    url: '/test',
    headers: {
      'x-request-id': 'req-1',
    },
  } as unknown as Request;

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}
