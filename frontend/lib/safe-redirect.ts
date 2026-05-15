export function getSafeRedirectPath(value: string | null | undefined) {
  if (!value) {
    return "/";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (/[\u0000-\u001f]/.test(value)) {
    return "/";
  }

  return value;
}
