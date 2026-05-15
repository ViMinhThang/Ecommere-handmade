import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "auth_access_token";
const REFRESH_TOKEN_COOKIE = "auth_refresh_token";
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getVersionedApiBaseUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (/\/v\d+($|\/)/i.test(normalized)) {
    return normalized;
  }
  return `${normalized}/v1`;
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    await fetch(`${getVersionedApiBaseUrl(RAW_API_URL)}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
