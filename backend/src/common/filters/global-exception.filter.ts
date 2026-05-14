import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

const PRISMA_BAD_REQUEST_CODES = new Set([
  'P2000',
  'P2005',
  'P2006',
  'P2007',
  'P2008',
  'P2009',
  'P2010',
  'P2011',
  'P2012',
  'P2013',
  'P2014',
  'P2019',
]);

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  error: string;
  errors?: string[];
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = this.extractRequestId(request, response);

    const payload = this.buildResponsePayload(exception, request, requestId);
    this.logException(exception, request, payload);

    response.status(payload.statusCode).json(payload);
  }

  private buildResponsePayload(
    exception: unknown,
    request: Request,
    requestId?: string,
  ): ErrorResponseBody {
    const defaultPayload: ErrorResponseBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(requestId ? { requestId } : {}),
    };

    if (exception instanceof HttpException) {
      const httpPayload = this.mapHttpException(exception);
      return {
        ...defaultPayload,
        ...httpPayload,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaPayload = this.mapPrismaKnownRequestError(exception);
      return {
        ...defaultPayload,
        ...prismaPayload,
      };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        ...defaultPayload,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid request data',
        error: 'Bad Request',
      };
    }

    if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientRustPanicError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return defaultPayload;
    }

    return defaultPayload;
  }

  private mapHttpException(
    exception: HttpException,
  ): Pick<ErrorResponseBody, 'statusCode' | 'message' | 'error' | 'errors'> {
    const statusCode = exception.getStatus();
    let message = this.getDefaultMessage(statusCode);
    let error = this.getDefaultErrorLabel(statusCode);
    let errors: string[] | undefined;

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
      const rawMessage = (exceptionResponse as { message?: unknown }).message;
      if (Array.isArray(rawMessage)) {
        errors = rawMessage.map((item) => String(item));
        message = errors.join(', ');
      } else if (typeof rawMessage === 'string' && rawMessage.length > 0) {
        message = rawMessage;
      }

      const rawError = (exceptionResponse as { error?: unknown }).error;
      if (typeof rawError === 'string' && rawError.length > 0) {
        error = rawError;
      }
    }

    // Prevent accidental leakage from server-side 5xx exceptions.
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return {
        statusCode,
        message: 'Internal server error',
        error: 'Internal Server Error',
      };
    }

    return {
      statusCode,
      message,
      error,
      errors,
    };
  }

  private mapPrismaKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): Pick<ErrorResponseBody, 'statusCode' | 'message' | 'error'> {
    if (exception.code === 'P2002') {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with the same unique value already exists',
        error: 'Conflict',
      };
    }

    if (exception.code === 'P2025') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Requested resource was not found',
        error: 'Not Found',
      };
    }

    if (PRISMA_BAD_REQUEST_CODES.has(exception.code)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid request data',
        error: 'Bad Request',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private logException(
    exception: unknown,
    request: Request,
    payload: ErrorResponseBody,
  ) {
    const requestIdSuffix = payload.requestId ? ` [${payload.requestId}]` : '';
    const baseMessage = `${request.method} ${request.url} ${payload.statusCode}${requestIdSuffix} - ${payload.message}`;

    if (payload.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        baseMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(baseMessage);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(
        `Prisma known error code=${exception.code} meta=${JSON.stringify(exception.meta ?? {})} message=${exception.message}`,
        exception.stack,
      );
      return;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(`Prisma validation error: ${exception.message}`);
      return;
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Prisma initialization error: ${exception.message}`);
      return;
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      this.logger.error(`Prisma rust panic: ${exception.message}`);
      return;
    }

    if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      this.logger.error(`Prisma unknown request error: ${exception.message}`);
    }
  }

  private getDefaultMessage(statusCode: number): string {
    if (statusCode === HttpStatus.NOT_FOUND) {
      return 'Resource not found';
    }

    if (statusCode === HttpStatus.CONFLICT) {
      return 'Conflict';
    }

    if (statusCode === HttpStatus.BAD_REQUEST) {
      return 'Bad request';
    }

    if (statusCode === HttpStatus.UNAUTHORIZED) {
      return 'Unauthorized';
    }

    if (statusCode === HttpStatus.FORBIDDEN) {
      return 'Forbidden';
    }

    return 'Internal server error';
  }

  private getDefaultErrorLabel(statusCode: number): string {
    if (statusCode === HttpStatus.BAD_REQUEST) {
      return 'Bad Request';
    }

    if (statusCode === HttpStatus.UNAUTHORIZED) {
      return 'Unauthorized';
    }

    if (statusCode === HttpStatus.FORBIDDEN) {
      return 'Forbidden';
    }

    if (statusCode === HttpStatus.NOT_FOUND) {
      return 'Not Found';
    }

    if (statusCode === HttpStatus.CONFLICT) {
      return 'Conflict';
    }

    return 'Internal Server Error';
  }

  private extractRequestId(request: Request, response: Response) {
    const requestHeaderId = request.headers['x-request-id'];
    if (Array.isArray(requestHeaderId)) {
      return requestHeaderId[0];
    }

    if (typeof requestHeaderId === 'string' && requestHeaderId.length > 0) {
      return requestHeaderId;
    }

    const responseHeaderId = response.getHeader('x-request-id');
    if (Array.isArray(responseHeaderId)) {
      return responseHeaderId[0]?.toString();
    }

    if (typeof responseHeaderId === 'string' && responseHeaderId.length > 0) {
      return responseHeaderId;
    }

    if (typeof responseHeaderId === 'number') {
      return String(responseHeaderId);
    }

    return undefined;
  }
}
