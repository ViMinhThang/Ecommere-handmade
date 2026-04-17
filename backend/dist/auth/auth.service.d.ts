import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from './mailer/mailer.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    private mailerService;
    private prisma;
    constructor(usersService: UsersService, jwtService: JwtService, mailerService: MailerService, prisma: PrismaService);
    private generateOtp;
    private hashToken;
    private getOtpExpiration;
    private validateOtp;
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
        refreshToken: string;
    }>;
    validateUser(userId: string): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        name: string;
        email: string;
        roles: import(".prisma/client").$Enums.Role[];
        avatar: string | null;
        phone: string | null;
        shopName: string | null;
        sellerTitle: string | null;
        sellerBio: string | null;
        sellerAbout: string | null;
        sellerHeroImage: string | null;
        sellerAboutImage: string | null;
        sellerStat1Label: string | null;
        sellerStat1Value: string | null;
        sellerStat2Label: string | null;
        sellerStat2Value: string | null;
        isEmailVerified: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        addresses: {
            address: string;
            phone: string;
            fullName: string;
            city: string;
            district: string;
            ward: string;
            isDefault: boolean;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
        }[];
    }>;
}
