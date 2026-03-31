import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from './mailer/mailer.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    private mailerService;
    constructor(usersService: UsersService, jwtService: JwtService, mailerService: MailerService);
    private generateOtp;
    private getOtpExpiration;
    register(registerDto: RegisterDto): Promise<{
        message: string;
        email: string;
    }>;
    verifyOtp(email: string, otpCode: string): Promise<{
        message: string;
    }>;
    login(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            name: string;
            roles: import(".prisma/client").$Enums.Role[];
            avatar: string | null;
            phone: string | null;
            shopName: string | null;
        };
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(email: string, otpCode: string, newPassword: string): Promise<{
        message: string;
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    validateUser(userId: string): Promise<{
        addresses: {
            address: string;
            phone: string;
            fullName: string;
            city: string;
            district: string;
            ward: string;
            isDefault: boolean;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
        }[];
    } & {
        image: string | null;
        name: string;
        email: string;
        password: string;
        roles: import(".prisma/client").$Enums.Role[];
        status: import(".prisma/client").$Enums.UserStatus;
        avatar: string | null;
        phone: string | null;
        shopName: string | null;
        otpCode: string | null;
        otpExpires: Date | null;
        isEmailVerified: boolean;
        id: string;
        ordersCount: number;
        totalSpent: number;
        products: number;
        sales: number;
        rating: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
