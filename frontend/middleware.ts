import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/settings", "/chat"];
const AUTH_ROUTES = ["/login", "/register", "/verify-otp", "/forgot-password", "/reset-password"];
const API_ROUTE = "/api";
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getVersionedApiBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (/\/v\d+($|\/)/i.test(normalized)) {
    return normalized;
  }
  return `${normalized}/v1`;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(API_ROUTE)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("auth_access_token")?.value;
  const refreshToken = request.cookies.get("auth_refresh_token")?.value;
  const isAuthenticated = !!accessToken;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !isAuthenticated) {
    if (refreshToken) {
      try {
        const apiBaseUrl = getVersionedApiBaseUrl(RAW_API_URL);
        const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
          const response = NextResponse.next();
          response.cookies.set("auth_access_token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60,
            path: "/",
          });
          response.cookies.set("auth_refresh_token", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
          });
          return response;
        }
      } catch {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.set("auth_access_token", "", { maxAge: 0, path: "/" });
        response.cookies.set("auth_refresh_token", "", { maxAge: 0, path: "/" });
        return response;
      }
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat",
    "/settings/:path*",
    "/login",
    "/register",
    "/verify-otp",
    "/forgot-password",
    "/reset-password",
  ],
};
