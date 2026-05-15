const DEFAULT_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return globalThis.atob(padded);
}

export function getJwtMaxAgeSeconds(
  token: string | undefined,
  fallbackSeconds = DEFAULT_COOKIE_MAX_AGE_SECONDS,
) {
  if (!token) {
    return fallbackSeconds;
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return fallbackSeconds;
    }

    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    if (typeof decoded.exp !== "number") {
      return fallbackSeconds;
    }

    const secondsUntilExpiry = Math.floor(decoded.exp - Date.now() / 1000);
    if (secondsUntilExpiry <= 0) {
      return 0;
    }

    return Math.min(secondsUntilExpiry, fallbackSeconds);
  } catch {
    return fallbackSeconds;
  }
}
