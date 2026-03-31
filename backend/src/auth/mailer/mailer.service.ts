import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
      throw new Error(
        'SMTP_USER and SMTP_PASS environment variables are required',
      );
    }
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user, pass },
    });
  }

  async sendOtpEmail(email: string, otp: string, type: 'register' | 'forgot') {
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
        this.logger.log(`[DEV MODE] OTP for ${email}: ${otp}`);
      }
    }
  }
}
