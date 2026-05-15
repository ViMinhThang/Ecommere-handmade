export const AUTH_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const AUTH_PASSWORD_REQUIREMENT =
  "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.";

export function isStrongAuthPassword(password: string) {
  return AUTH_PASSWORD_PATTERN.test(password);
}
