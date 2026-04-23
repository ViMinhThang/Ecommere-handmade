export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const matches = document.cookie.match(new RegExp(`(?:^|; )${ACCESS_TOKEN_COOKIE}=([^;]*)`));
  return matches ? decodeURIComponent(matches[1]) : null;
}

const ACCESS_TOKEN_COOKIE = "auth_access_token";