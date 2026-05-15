import { API_BASE_URL } from "@/lib/api-base-url";

export { API_BASE_URL };

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

  private shouldRefreshOnUnauthorized(endpoint: string) {
    return !endpoint.startsWith("/auth/");
  }

  private async parseErrorResponse(
    response: Response,
    fallbackMessage: string,
  ) {
    const data = (await response
      .json()
      .catch(() => ({ message: fallbackMessage }))) as Record<string, unknown>;
    const rawMessage = data.message;
    const message =
      typeof rawMessage === "string"
        ? rawMessage
        : Array.isArray(rawMessage)
          ? rawMessage.join(", ")
          : fallbackMessage;

    return { data, message };
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
      const canRefresh = this.shouldRefreshOnUnauthorized(endpoint);

      if (!didRetry && canRefresh && (await this.refreshSession())) {
        return this.request<T>(endpoint, options, true);
      }

      const { data, message } = await this.parseErrorResponse(
        response,
        "Unauthorized",
      );

      if (typeof window !== "undefined" && canRefresh) {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
      throw new ApiError(message, 401, data);
    }

    if (!response.ok) {
      const { data, message } = await this.parseErrorResponse(
        response,
        `HTTP error! status: ${response.status}`,
      );
      throw new ApiError(message, response.status, data);
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
