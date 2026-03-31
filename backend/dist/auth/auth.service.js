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
const users_service_1 = require("../users/users.service");
const mailer_service_1 = require("./mailer/mailer.service");
let AuthService = class AuthService {
    usersService;
    jwtService;
    mailerService;
    constructor(usersService, jwtService, mailerService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.mailerService = mailerService;
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    getOtpExpiration() {
        return new Date(Date.now() + 10 * 60 * 1000);
    }
    async register(registerDto) {
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            if (existingUser.isEmailVerified) {
                throw new common_1.BadRequestException('Email already registered');
            }
            const otpCode = this.generateOtp();
            const otpExpires = this.getOtpExpiration();
            await this.usersService.update(existingUser.id, {
                otpCode,
                otpExpires,
            });
            await this.mailerService.sendOtpEmail(existingUser.email, otpCode, 'register');
            return {
                message: 'A new verification code has been sent to your email.',
                email: existingUser.email,
            };
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const otpCode = this.generateOtp();
        const otpExpires = this.getOtpExpiration();
        const user = await this.usersService.create({
            ...registerDto,
            password: hashedPassword,
            otpCode,
            otpExpires,
            roles: ['ROLE_USER'],
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
        if (user.isEmailVerified) {
            throw new common_1.BadRequestException('Email already verified');
        }
        if (!user.otpCode || user.otpCode !== otpCode) {
            throw new common_1.UnauthorizedException('Invalid OTP code');
        }
        if (user.otpExpires && new Date() > user.otpExpires) {
            throw new common_1.UnauthorizedException('OTP code has expired');
        }
        await this.usersService.update(user.id, {
            isEmailVerified: true,
            otpCode: undefined,
            otpExpires: undefined,
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
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
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
        if (!user) {
            return { message: 'If the email exists, an OTP will be sent' };
        }
        const otpCode = this.generateOtp();
        const otpExpires = this.getOtpExpiration();
        await this.usersService.update(user.id, {
            otpCode,
            otpExpires,
        });
        await this.mailerService.sendOtpEmail(email, otpCode, 'forgot');
        return { message: 'If the email exists, an OTP will be sent' };
    }
    async resetPassword(email, otpCode, newPassword) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.otpCode || user.otpCode !== otpCode) {
            throw new common_1.UnauthorizedException('Invalid OTP code');
        }
        if (user.otpExpires && new Date() > user.otpExpires) {
            throw new common_1.UnauthorizedException('OTP code has expired');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.usersService.update(user.id, {
            password: hashedPassword,
            otpCode: undefined,
            otpExpires: undefined,
        });
        return { message: 'Password reset successfully' };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const newAccessToken = this.jwtService.sign({
                sub: payload.sub,
                email: payload.email,
                roles: payload.roles,
            }, { expiresIn: '15m' });
            return { accessToken: newAccessToken };
        }
        catch {
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
        mailer_service_1.MailerService])
], AuthService);
//# sourceMappingURL=auth.service.js.map