export declare class MailerService {
    private readonly logger;
    private transporter;
    constructor();
    sendOtpEmail(email: string, otp: string, type: 'register' | 'forgot'): Promise<void>;
}
