"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const media_service_1 = require("./media.service");
const folder_dto_1 = require("./dto/folder.dto");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|jpg|png|gif|webp)$/;
const MAGIC_BYTES = {
    'image/jpeg': [[0xff, 0xd8, 0xff]],
    'image/png': [[0x89, 0x50, 0x4e, 0x47]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};
function validateFileContent(file) {
    const expectedBytes = MAGIC_BYTES[file.mimetype];
    if (!expectedBytes) {
        return;
    }
    const buffer = file.buffer;
    for (const signature of expectedBytes) {
        let matches = true;
        for (let i = 0; i < signature.length; i++) {
            if (buffer[i] !== signature[i]) {
                matches = false;
                break;
            }
        }
        if (matches) {
            return;
        }
    }
    throw new common_1.BadRequestException('File content does not match declared type');
}
let MediaController = class MediaController {
    mediaService;
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    createFolder(req, createFolderDto) {
        return this.mediaService.createFolder(req.user.id, createFolderDto);
    }
    getFolders(req) {
        return this.mediaService.getFolders(req.user.id);
    }
    getFolder(req, folderId) {
        return this.mediaService.getFolder(req.user.id, folderId);
    }
    updateFolder(req, folderId, updateFolderDto) {
        return this.mediaService.updateFolder(req.user.id, folderId, updateFolderDto);
    }
    deleteFolder(req, folderId) {
        return this.mediaService.deleteFolder(req.user.id, folderId);
    }
    uploadImage(req, folderId, file, displayName) {
        validateFileContent(file);
        return this.mediaService.uploadImage(req.user.id, folderId, file, displayName);
    }
    getImages(req, folderId) {
        return this.mediaService.getImages(req.user.id, folderId);
    }
    getImage(req, imageId) {
        return this.mediaService.getImage(req.user.id, imageId);
    }
    deleteImage(req, imageId) {
        return this.mediaService.deleteImage(req.user.id, imageId);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('folders'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, folder_dto_1.CreateFolderDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "createFolder", null);
__decorate([
    (0, common_1.Get)('folders'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getFolders", null);
__decorate([
    (0, common_1.Get)('folders/:folderId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getFolder", null);
__decorate([
    (0, common_1.Patch)('folders/:folderId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('folderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, folder_dto_1.UpdateFolderDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "updateFolder", null);
__decorate([
    (0, common_1.Delete)('folders/:folderId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "deleteFolder", null);
__decorate([
    (0, common_1.Post)('folders/:folderId/images'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (ALLOWED_IMAGE_TYPES.test(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
            }
        },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('folderId')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)('displayName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Get)('folders/:folderId/images'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getImages", null);
__decorate([
    (0, common_1.Get)('images/:imageId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('imageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getImage", null);
__decorate([
    (0, common_1.Delete)('images/:imageId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('imageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "deleteImage", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map