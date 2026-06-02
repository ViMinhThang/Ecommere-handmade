import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrlCandidates } from "./lib/api-base-url";
import { getJwtMaxAgeSeconds } from "./lib/auth-token";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/settings",
  "/chat",
  "/profile",
  "/checkout",
  "/seller",
  "/custom-orders",
];
const AUTH_ROUTES = ["/login", "/register", "/verify-otp", "/forgot-password", "/reset-password"];
const API_ROUTE = "/api";

function decodeJwtPayload(token: string | undefined) {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as { roles?: unknown };
  } catch {
    return null;
  }
}

function getRoleList(accessToken: string | undefined) {
  const roles = decodeJwtPayload(accessToken)?.roles;
  return Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === "string")
    : [];
}

function getAuthenticatedLandingPath(accessToken: string | undefined) {
  const roleList = getRoleList(accessToken);
  if (roleList.includes("ROLE_ADMIN") || roleList.includes("ROLE_SELLER")) {
    return "/dashboard";
  }

  return "/profile/settings";
}

function getRoleFallbackPath(pathname: string, accessToken: string | undefined) {
  const roleList = getRoleList(accessToken);
  const isAdmin = roleList.includes("ROLE_ADMIN");
  const isSeller = roleList.includes("ROLE_SELLER");

  if (pathname.startsWith("/dashboard") && !isAdmin && !isSeller) {
    return "/profile/settings";
  }

  if (pathname.startsWith("/seller")) {
    if (isAdmin) {
      return "/dashboard";
    }

    if (!isSeller) {
      return "/profile/settings";
    }
  }

  return null;
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set("auth_access_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("auth_refresh_token", "", { maxAge: 0, path: "/" });
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "redirect",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
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
        let refreshResponse: Response | null = null;
        for (const apiBaseUrl of getApiBaseUrlCandidates()) {
          try {
            refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
              cache: "no-store",
            });
            break;
          } catch {
            refreshResponse = null;
          }
        }

        if (refreshResponse?.ok) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
          const response = NextResponse.next();
          response.cookies.set("auth_access_token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: getJwtMaxAgeSeconds(newAccessToken, 30 * 24 * 60 * 60),
            path: "/",
          });
          response.cookies.set("auth_refresh_token", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: getJwtMaxAgeSeconds(newRefreshToken, 30 * 24 * 60 * 60),
            path: "/",
          });
          return response;
        }

        const response = redirectToLogin(request);
        clearAuthCookies(response);
        return response;
      } catch {
        const response = redirectToLogin(request);
        clearAuthCookies(response);
        return response;
      }
    }

    return redirectToLogin(request);
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(
      new URL(getAuthenticatedLandingPath(accessToken), request.url),
    );
  }

  if (isProtectedRoute && isAuthenticated) {
    const roleFallbackPath = getRoleFallbackPath(pathname, accessToken);
    if (roleFallbackPath && roleFallbackPath !== pathname) {
      return NextResponse.redirect(new URL(roleFallbackPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat",
    "/settings/:path*",
    "/profile/:path*",
    "/checkout/:path*",
    "/seller/:path*",
    "/custom-orders/:path*",
    "/login",
    "/register",
    "/verify-otp",
    "/forgot-password",
    "/reset-password",
  ],
};
