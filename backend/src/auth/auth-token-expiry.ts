import type { StringValue } from 'ms';

export const DEFAULT_ACCESS_TOKEN_EXPIRY: StringValue = '15m';
export const DEFAULT_REFRESH_TOKEN_EXPIRY: StringValue = '30d';
export const DEFAULT_REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeJwtExpiry(
  value: string | undefined,
  fallback: StringValue,
): StringValue {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+[smhd]$/i.test(trimmed)) {
    return fallback;
  }

  return trimmed as StringValue;
}

export function parseDurationMs(value: StringValue, fallbackMs: number) {
  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}
