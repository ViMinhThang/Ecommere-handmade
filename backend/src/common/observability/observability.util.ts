import { HttpException } from '@nestjs/common';

const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|cookie|signature|card|cvv|cvc|api[_-]?key)/i;

const MAX_STRING_LENGTH = 240;

type LoggerLike = Pick<Console, 'log' | 'warn' | 'error'>;

export type ObservabilityLogLevel = 'log' | 'warn' | 'error';

export interface ObservabilityEventPayload {
  event: string;
  timestamp: string;
  requestId?: string;
  [key: string]: unknown;
}

export function emitObservabilityEvent(
  logger: LoggerLike,
  level: ObservabilityLogLevel,
  event: string,
  details: Record<string, unknown> = {},
) {
  try {
    const payload: ObservabilityEventPayload = {
      event,
      timestamp: new Date().toISOString(),
      ...sanitizeObservabilityDetails(details),
    };
    logger[level](serializeObservabilityPayload(payload));
  } catch {
    try {
      const fallbackPayload: ObservabilityEventPayload = {
        event,
        timestamp: new Date().toISOString(),
        ...(typeof details.requestId === 'string' &&
        details.requestId.length > 0
          ? { requestId: details.requestId }
          : {}),
      };
      logger[level](serializeObservabilityPayload(fallbackPayload));
    } catch {
      // Observability should never break request handling.
    }
  }
}

export function sanitizeObservabilityDetails(
  value: unknown,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return sanitizeValue(value, new WeakSet<object>()) as Record<string, unknown>;
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
    };
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, itemValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? '[REDACTED]'
          : sanitizeValue(itemValue, seen),
      ],
    );
    return Object.fromEntries(entries);
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  return value;
}

function sanitizeString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const redacted = trimmed
    .replace(
      /\b(password|token|secret|authorization|cookie|signature)\b\s*[:=]\s*([^\s,;]+)/gi,
      '$1=[REDACTED]',
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+\b/gi, 'Bearer [REDACTED]');

  return redacted.slice(0, MAX_STRING_LENGTH);
}

function serializeObservabilityPayload(value: unknown): string {
  return JSON.stringify(value, (_key, itemValue: unknown) =>
    typeof itemValue === 'bigint' ? itemValue.toString() : itemValue,
  );
}

export function extractRequestIdFromHeaders(
  headers?: Record<string, unknown>,
): string | undefined {
  if (!headers) {
    return undefined;
  }

  const headerValue = headers['x-request-id'] ?? headers['X-Request-Id'];
  if (Array.isArray(headerValue)) {
    return extractRequestIdFromArray(headerValue);
  }

  if (typeof headerValue === 'string') {
    return headerValue.length > 0 ? headerValue : undefined;
  }

  return undefined;
}

function extractRequestIdFromArray(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

export function describeErrorForObservability(error: unknown) {
  if (error instanceof HttpException) {
    return {
      errorName: error.name,
      statusCode: error.getStatus(),
    };
  }

  if (error instanceof Error) {
    return {
      errorName: error.name,
    };
  }

  return {
    errorName: 'UnknownError',
  };
}
