import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "auth_access_token";
const REFRESH_TOKEN_COOKIE = "auth_refresh_token";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getVersionedApiBaseUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (/\/v\d+($|\/)/i.test(normalized)) {
    return normalized;
  }
  return `${normalized}/v1`;
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Refresh token is required" }, { status: 401 });
  }

  const response = await fetch(`${getVersionedApiBaseUrl(RAW_API_URL)}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const clearResponse = NextResponse.json({ error: "Session expired" }, { status: 401 });
    clearResponse.cookies.set(ACCESS_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
    clearResponse.cookies.set(REFRESH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
    return clearResponse;
  }

  const { accessToken, refreshToken: nextRefreshToken } = await response.json();
  const nextResponse = NextResponse.json({ success: true });
  nextResponse.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  nextResponse.cookies.set(REFRESH_TOKEN_COOKIE, nextRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return nextResponse;
}
