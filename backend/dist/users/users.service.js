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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    userSelect = {
        id: true,
        name: true,
        email: true,
        roles: true,
        status: true,
        avatar: true,
        phone: true,
        shopName: true,
        sellerTitle: true,
        sellerBio: true,
        sellerAbout: true,
        sellerHeroImage: true,
        sellerAboutImage: true,
        sellerStat1Label: true,
        sellerStat1Value: true,
        sellerStat2Label: true,
        sellerStat2Value: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        addresses: true,
    };
    processRoles(roles) {
        if (!roles || roles.length === 0) {
            return ['ROLE_USER'];
        }
        const roleSet = new Set(roles);
        if (roleSet.has('ROLE_ADMIN')) {
            return ['ROLE_USER', 'ROLE_SELLER', 'ROLE_ADMIN'];
        }
        if (roleSet.has('ROLE_SELLER')) {
            return ['ROLE_USER', 'ROLE_SELLER'];
        }
        return ['ROLE_USER'];
    }
    async create(createUserDto) {
        const roles = this.processRoles(createUserDto.roles);
        const password = createUserDto.password || 'Handmade@123';
        const hashedPassword = await bcrypt.hash(password, 10);
        return this.prisma.user.create({
            data: {
                name: createUserDto.name,
                email: createUserDto.email,
                password: hashedPassword,
                roles,
                avatar: createUserDto.avatar,
                phone: createUserDto.phone,
                shopName: createUserDto.shopName,
                status: createUserDto.status,
                isEmailVerified: createUserDto.isEmailVerified ?? false,
            },
            select: this.userSelect,
        });
    }
    async findAll(role, status, pagination) {
        const where = {
            deletedAt: null,
        };
        if (role) {
            where.roles = {
                has: role.toUpperCase(),
            };
        }
        if (status)
            where.status = status.toUpperCase();
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 20;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    roles: true,
                    status: true,
                    avatar: true,
                    phone: true,
                    shopName: true,
                    isEmailVerified: true,
                    createdAt: true,
                    updatedAt: true,
                    addresses: true,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: this.userSelect,
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async update(id, updateUserDto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        let roles = user.roles;
        if (updateUserDto.roles) {
            roles = this.processRoles(updateUserDto.roles);
        }
        return this.prisma.user.update({
            where: { id },
            data: {
                ...updateUserDto,
                roles,
            },
            select: this.userSelect,
        });
    }
    async remove(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return this.prisma.user.delete({ where: { id } });
    }
    async getStats() {
        const [total, admins, sellers] = await Promise.all([
            this.prisma.user.count({ where: { deletedAt: null } }),
            this.prisma.user.count({
                where: { roles: { has: 'ROLE_ADMIN' }, deletedAt: null },
            }),
            this.prisma.user.count({
                where: { roles: { has: 'ROLE_SELLER' }, deletedAt: null },
            }),
        ]);
        const customers = total - sellers;
        return { total, admins, sellers, customers };
    }
    async addAddress(userId, createAddressDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        if (createAddressDto.isDefault) {
            await this.prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }
        const addressCount = await this.prisma.address.count({
            where: { userId },
        });
        if (addressCount >= 5) {
            throw new common_1.BadRequestException('Maximum 5 addresses allowed');
        }
        return this.prisma.address.create({
            data: {
                ...createAddressDto,
                userId,
            },
        });
    }
    async getAddresses(userId) {
        return this.prisma.address.findMany({
            where: { userId },
        });
    }
    async updateAddress(userId, addressId, updateAddressDto) {
        const address = await this.prisma.address.findFirst({
            where: { id: addressId, userId },
        });
        if (!address) {
            throw new common_1.NotFoundException(`Address not found`);
        }
        if (updateAddressDto.isDefault) {
            await this.prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }
        return this.prisma.address.update({
            where: { id: addressId },
            data: updateAddressDto,
        });
    }
    async deleteAddress(userId, addressId) {
        const address = await this.prisma.address.findFirst({
            where: { id: addressId, userId },
        });
        if (!address) {
            throw new common_1.NotFoundException(`Address not found`);
        }
        return this.prisma.address.delete({ where: { id: addressId } });
    }
    async updateOtpFields(userId, data) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map