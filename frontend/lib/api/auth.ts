import { apiClient } from './client';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyOtpData {
  email: string;
  otpCode: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  otpCode: string;
  newPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  avatar?: string;
  phone?: string;
  shopName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
  email?: string;
}

export const authApi = {
  register: (data: RegisterData) =>
    apiClient.post<MessageResponse>('/auth/register', data),

  verifyOtp: (data: VerifyOtpData) =>
    apiClient.post<MessageResponse>('/auth/verify-otp', data),

  login: (data: LoginData) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  forgotPassword: (data: ForgotPasswordData) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', data),

  resetPassword: (data: ResetPasswordData) =>
    apiClient.post<MessageResponse>('/auth/reset-password', data),

  refresh: () =>
    apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {}),
};
