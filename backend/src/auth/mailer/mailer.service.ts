import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: nodemailer.Transporter;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!this.hasUsableSmtpCredentials(user, pass)) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'SMTP_USER and SMTP_PASS environment variables are required',
        );
      }

      this.logger.warn(
        'SMTP is not configured. OTP emails will be logged to the terminal.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user, pass },
    });
  }

  private hasUsableSmtpCredentials(user?: string, pass?: string) {
    const normalizedUser = user?.trim().toLowerCase();
    const normalizedPass = pass?.trim().toLowerCase();

    if (!normalizedUser || !normalizedPass) {
      return false;
    }

    const placeholderValues = new Set([
      'dummy@gmail.com',
      'your-smtp-app-password',
      'replace-with-smtp-user',
      'replace-with-smtp-pass',
    ]);

    return (
      !placeholderValues.has(normalizedUser) &&
      !placeholderValues.has(normalizedPass)
    );
  }

  private logDevOtp(email: string, otp: string, type: 'register' | 'forgot') {
    this.logger.log(`[DEV MAIL] ${type} OTP for ${email}: ${otp}`);
  }

  async sendOtpEmail(email: string, otp: string, type: 'register' | 'forgot') {
    if (!this.transporter) {
      this.logDevOtp(email, otp, type);
      return;
    }

    const subject =
      type === 'register'
        ? 'Verify your email - HandCraft Market'
        : 'Reset your password - HandCraft Market';

    const message =
      type === 'register'
        ? `Welcome to HandCraft Market!\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nPlease enter this code to verify your email address.`
        : `You requested to reset your password.\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;

    try {
      await this.transporter.sendMail({
        from:
          process.env.SMTP_FROM || '"HandCraft Market" <noreply@handcraft.com>',
        to: email,
        subject,
        text: message,
      });
      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      if (process.env.NODE_ENV !== 'production') {
        this.logDevOtp(email, otp, type);
      }
    }
  }
}
