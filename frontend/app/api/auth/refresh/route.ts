import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrlCandidates } from "@/lib/api-base-url";
import { getJwtMaxAgeSeconds } from "@/lib/auth-token";

const ACCESS_TOKEN_COOKIE = "auth_access_token";
const REFRESH_TOKEN_COOKIE = "auth_refresh_token";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
}

async function requestBackendRefresh(refreshToken: string) {
  let lastError: unknown;

  for (const apiBaseUrl of getApiBaseUrlCandidates()) {
    try {
      return await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Refresh token is required" }, { status: 401 });
  }

  let response: Response;
  try {
    response = await requestBackendRefresh(refreshToken);
  } catch (error) {
    console.error(
      "[auth-refresh] Backend unavailable",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { error: "Authentication service unavailable" },
      { status: 503 },
    );
  }

  if (!response.ok) {
    const status = response.status === 401 || response.status === 403
      ? 401
      : response.status;
    const clearResponse = NextResponse.json(
      { error: status === 401 ? "Session expired" : "Authentication service unavailable" },
      { status },
    );
    if (status === 401) {
      clearAuthCookies(clearResponse);
    }
    return clearResponse;
  }

  const { accessToken, refreshToken: nextRefreshToken } = await response.json();
  const nextResponse = NextResponse.json({ success: true, accessToken });
  nextResponse.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: getJwtMaxAgeSeconds(accessToken, COOKIE_MAX_AGE),
    path: "/",
  });
  nextResponse.cookies.set(REFRESH_TOKEN_COOKIE, nextRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: getJwtMaxAgeSeconds(nextRefreshToken, COOKIE_MAX_AGE),
    path: "/",
  });

  return nextResponse;
}
