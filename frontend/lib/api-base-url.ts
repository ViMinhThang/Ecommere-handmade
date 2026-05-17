const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const DEFAULT_API_VERSION = "v1";

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function hasVersionSegment(value: string): boolean {
  return /\/v\d+($|\/)/i.test(value);
}

export function getVersionedApiBaseUrl(baseUrl: string = RAW_API_URL): string {
  const normalized = trimTrailingSlashes(baseUrl);
  if (hasVersionSegment(normalized)) {
    return normalized;
  }
  return `${normalized}/${DEFAULT_API_VERSION}`;
}

export function getApiBaseUrlCandidates(baseUrl: string = RAW_API_URL): string[] {
  const primary = getVersionedApiBaseUrl(baseUrl);
  const candidates = [primary];

  try {
    const url = new URL(primary);
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
    } else if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
    } else {
      return candidates;
    }

    const fallback = trimTrailingSlashes(url.toString());
    if (!candidates.includes(fallback)) {
      candidates.push(fallback);
    }
  } catch {
    return candidates;
  }

  return candidates;
}

export const API_BASE_URL = getVersionedApiBaseUrl();
