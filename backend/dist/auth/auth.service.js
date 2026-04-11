"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const users_service_1 = require("../users/users.service");
const prisma_service_1 = require("../prisma/prisma.service");
const mailer_service_1 = require("./mailer/mailer.service");
const OTP_MIN = 100000;
const OTP_MAX = 999999;
const OTP_EXPIRATION_MS = 10 * 60 * 1000;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const ACCESS_TOKEN_EXPIRY = '30d';
const REFRESH_TOKEN_EXPIRY = '30d';
let AuthService = class AuthService {
    usersService;
    jwtService;
    mailerService;
    prisma;
    constructor(usersService, jwtService, mailerService, prisma) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.mailerService = mailerService;
        this.prisma = prisma;
    }
    generateOtp() {
        return (0, crypto_1.randomInt)(OTP_MIN, OTP_MAX + 1).toString();
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    getOtpExpiration() {
        return new Date(Date.now() + OTP_EXPIRATION_MS);
    }
    validateOtp(user, otpCode) {
        if (user.isEmailVerified) {
            throw new common_1.BadRequestException('Email already verified');
        }
        if (!user.otpCode) {
            throw new common_1.UnauthorizedException('Invalid OTP code');
        }
        const hashedOtp = this.hashToken(otpCode);
        if (user.otpCode !== hashedOtp) {
            throw new common_1.UnauthorizedException('Invalid OTP code');
        }
        if (user.otpExpires && new Date() > user.otpExpires) {
            throw new common_1.UnauthorizedException('OTP code has expired');
        }
    }
    async register(registerDto) {
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            if (existingUser.isEmailVerified) {
                throw new common_1.BadRequestException('Email already registered');
            }
            const otpCode = this.generateOtp();
            const otpExpires = this.getOtpExpiration();
            await this.usersService.updateOtpFields(existingUser.id, {
                otpCode: this.hashToken(otpCode),
                otpExpires,
            });
            await this.mailerService.sendOtpEmail(existingUser.email, otpCode, 'register');
            return {
                message: 'A new verification code has been sent to your email.',
                email: existingUser.email,
            };
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, BCRYPT_ROUNDS);
        const otpCode = this.generateOtp();
        const otpExpires = this.getOtpExpiration();
        const user = await this.usersService.create({
            ...registerDto,
            password: hashedPassword,
            roles: ['ROLE_USER'],
        });
        await this.usersService.updateOtpFields(user.id, {
            otpCode: this.hashToken(otpCode),
            otpExpires,
        });
        await this.mailerService.sendOtpEmail(user.email, otpCode, 'register');
        return {
            message: 'Registration successful. Please verify your email with the OTP sent to your email.',
            email: user.email,
        };
    }
    async verifyOtp(email, otpCode) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        this.validateOtp(user, otpCode);
        await this.usersService.updateOtpFields(user.id, {
            isEmailVerified: true,
            otpCode: null,
            otpExpires: null,
        });
        return { message: 'Email verified successfully' };
    }
    async login(email, password) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isEmailVerified) {
            throw new common_1.UnauthorizedException('Please verify your email first');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const payload = { sub: user.id, email: user.email, roles: user.roles };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: ACCESS_TOKEN_EXPIRY,
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: REFRESH_TOKEN_EXPIRY,
        });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: this.hashToken(refreshToken),
                expiresAt,
            },
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                roles: user.roles,
                avatar: user.avatar,
                phone: user.phone,
                shopName: user.shopName,
            },
        };
    }
    async forgotPassword(email) {
        const user = await this.usersService.findByEmail(email);
        if (user) {
            const otpCode = this.generateOtp();
            const otpExpires = this.getOtpExpiration();
            await this.usersService.updateOtpFields(user.id, {
                otpCode: this.hashToken(otpCode),
                otpExpires,
            });
            await this.mailerService.sendOtpEmail(email, otpCode, 'forgot');
        }
        return { message: 'If the email exists, an OTP will be sent' };
    }
    async resetPassword(email, otpCode, newPassword) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        this.validateOtp(user, otpCode);
        const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await this.usersService.updateOtpFields(user.id, {
            password: hashedPassword,
            otpCode: null,
            otpExpires: null,
        });
        return { message: 'Password reset successfully' };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const hashedToken = this.hashToken(refreshToken);
            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { token: hashedToken },
            });
            if (!storedToken ||
                storedToken.revoked ||
                storedToken.expiresAt < new Date()) {
                throw new common_1.UnauthorizedException('Invalid or expired refresh token');
            }
            const newAccessToken = this.jwtService.sign({
                sub: payload.sub,
                email: payload.email,
                roles: payload.roles,
            }, { expiresIn: ACCESS_TOKEN_EXPIRY });
            const newRefreshToken = this.jwtService.sign({
                sub: payload.sub,
                email: payload.email,
                roles: payload.roles,
            }, { expiresIn: REFRESH_TOKEN_EXPIRY });
            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + 30);
            await this.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: {
                    revoked: true,
                    replacedByToken: this.hashToken(newRefreshToken),
                },
            });
            await this.prisma.refreshToken.create({
                data: {
                    userId: payload.sub,
                    token: this.hashToken(newRefreshToken),
                    expiresAt: newExpiresAt,
                },
            });
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async validateUser(userId) {
        return this.usersService.findOne(userId);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        mailer_service_1.MailerService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map