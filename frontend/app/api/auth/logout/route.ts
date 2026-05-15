import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrlCandidates } from "@/lib/api-base-url";

const ACCESS_TOKEN_COOKIE = "auth_access_token";
const REFRESH_TOKEN_COOKIE = "auth_refresh_token";

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    for (const apiBaseUrl of getApiBaseUrlCandidates()) {
      try {
        await fetch(`${apiBaseUrl}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
        });
        break;
      } catch {
        // Local logout still clears browser cookies if the backend is unavailable.
      }
    }
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
