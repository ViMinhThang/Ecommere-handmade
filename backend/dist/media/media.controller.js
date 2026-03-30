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
let MediaController = class MediaController {
    mediaService;
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    createFolder(userId, createFolderDto) {
        return this.mediaService.createFolder(userId, createFolderDto);
    }
    getFolders(userId) {
        return this.mediaService.getFolders(userId);
    }
    getFolder(userId, folderId) {
        return this.mediaService.getFolder(userId, folderId);
    }
    updateFolder(userId, folderId, updateFolderDto) {
        return this.mediaService.updateFolder(userId, folderId, updateFolderDto);
    }
    deleteFolder(userId, folderId) {
        return this.mediaService.deleteFolder(userId, folderId);
    }
    uploadImage(userId, folderId, file, displayName) {
        return this.mediaService.uploadImage(userId, folderId, file, displayName);
    }
    getImages(userId, folderId) {
        return this.mediaService.getImages(userId, folderId);
    }
    getImage(userId, imageId) {
        return this.mediaService.getImage(userId, imageId);
    }
    deleteImage(userId, imageId) {
        return this.mediaService.deleteImage(userId, imageId);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('folders'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, folder_dto_1.CreateFolderDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "createFolder", null);
__decorate([
    (0, common_1.Get)('folders'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getFolders", null);
__decorate([
    (0, common_1.Get)('folders/:folderId'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Param)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getFolder", null);
__decorate([
    (0, common_1.Patch)('folders/:folderId'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Param)('folderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, folder_dto_1.UpdateFolderDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "updateFolder", null);
__decorate([
    (0, common_1.Delete)('folders/:folderId'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Param)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "deleteFolder", null);
__decorate([
    (0, common_1.Post)('folders/:folderId/images'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Param)('folderId')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)('displayName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Get)('folders/:folderId/images'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Param)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getImages", null);
__decorate([
    (0, common_1.Get)('images/:imageId'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Param)('imageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getImage", null);
__decorate([
    (0, common_1.Delete)('images/:imageId'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Param)('imageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "deleteImage", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map