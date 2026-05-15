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

export const API_BASE_URL = getVersionedApiBaseUrl();

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  isApiError = true;

  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async refreshSession() {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const response = await fetch("/api/auth/refresh", { method: "POST" });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    didRetry = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {};

    // Spread existing headers if they're a plain object
    if (options.headers) {
      const existing = options.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : Array.isArray(options.headers)
          ? Object.fromEntries(options.headers)
          : options.headers as Record<string, string>;
      Object.assign(headers, existing);
    }

    // Only set Content-Type to application/json if it's not FormData and not already set
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const requestHeaders = new Headers(headers);

    const response = await fetch(url, {
      ...options,
      headers: requestHeaders,
      credentials: "include",
    });

    if (response.status === 401) {
      if (!didRetry && (await this.refreshSession())) {
        return this.request<T>(endpoint, options, true);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
      throw new ApiError("Unauthorized", 401, { message: "Unauthorized" });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "An error occurred" }));
      const message = errorData.message || `HTTP error! status: ${response.status}`;
      throw new ApiError(message, response.status, errorData);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, data?: unknown, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  }

  patch<T>(endpoint: string, data: unknown, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
