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
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const fs_1 = require("fs");
const path = __importStar(require("path"));
let MediaService = class MediaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createFolder(userId, createFolderDto) {
        return this.prisma.imageFolder.create({
            data: {
                name: createFolderDto.name,
                userId,
            },
        });
    }
    async getFolders(userId) {
        return this.prisma.imageFolder.findMany({
            where: { userId, deletedAt: null },
            include: {
                _count: {
                    select: { images: { where: { deletedAt: null } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getFolder(userId, folderId) {
        const folder = await this.prisma.imageFolder.findFirst({
            where: { id: folderId, userId, deletedAt: null },
            include: {
                images: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Folder not found');
        }
        return folder;
    }
    async updateFolder(userId, folderId, updateFolderDto) {
        const folder = await this.prisma.imageFolder.findFirst({
            where: { id: folderId, userId },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Folder not found');
        }
        return this.prisma.imageFolder.update({
            where: { id: folderId },
            data: updateFolderDto,
        });
    }
    async deleteFolder(userId, folderId) {
        const folder = await this.prisma.imageFolder.findFirst({
            where: { id: folderId, userId },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Folder not found');
        }
        return this.prisma.imageFolder.delete({
            where: { id: folderId },
        });
    }
    async uploadImage(userId, folderId, file, displayName) {
        const folder = await this.prisma.imageFolder.findFirst({
            where: { id: folderId, userId, deletedAt: null },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Folder not found');
        }
        const uploadPath = path.join('uploads', userId, folderId);
        await fs_1.promises.mkdir(uploadPath, { recursive: true });
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadPath, fileName);
        await fs_1.promises.writeFile(filePath, file.buffer);
        return this.prisma.image.create({
            data: {
                displayName,
                path: `${userId}/${folderId}/${fileName}`,
                folderId,
            },
        });
    }
    async getImages(userId, folderId) {
        const folder = await this.prisma.imageFolder.findFirst({
            where: { id: folderId, userId, deletedAt: null },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Folder not found');
        }
        return this.prisma.image.findMany({
            where: { folderId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deleteImage(userId, imageId) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId },
            include: { folder: true },
        });
        if (!image || image.folder.userId !== userId) {
            throw new common_1.NotFoundException('Image not found');
        }
        return this.prisma.image.delete({
            where: { id: imageId },
        });
    }
    async getImage(userId, imageId) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId },
            include: { folder: true },
        });
        if (!image || image.folder.userId !== userId) {
            throw new common_1.NotFoundException('Image not found');
        }
        return image;
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MediaService);
//# sourceMappingURL=media.service.js.map