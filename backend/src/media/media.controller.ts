import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import {
  isAllowedImageMimeType,
  validateImageFile,
} from '../common/utils/image-upload';

@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('folders')
  createFolder(
    @Request() req: AuthenticatedRequest,
    @Body() createFolderDto: CreateFolderDto,
  ) {
    return this.mediaService.createFolder(req.user.id, createFolderDto);
  }

  @Get('folders')
  getFolders(@Request() req: AuthenticatedRequest) {
    return this.mediaService.getFolders(req.user.id);
  }

  @Get('folders/:folderId')
  getFolder(
    @Request() req: AuthenticatedRequest,
    @Param('folderId') folderId: string,
  ) {
    return this.mediaService.getFolder(req.user.id, folderId);
  }

  @Patch('folders/:folderId')
  updateFolder(
    @Request() req: AuthenticatedRequest,
    @Param('folderId') folderId: string,
    @Body() updateFolderDto: UpdateFolderDto,
  ) {
    return this.mediaService.updateFolder(
      req.user.id,
      folderId,
      updateFolderDto,
    );
  }

  @Delete('folders/:folderId')
  deleteFolder(
    @Request() req: AuthenticatedRequest,
    @Param('folderId') folderId: string,
  ) {
    return this.mediaService.deleteFolder(req.user.id, folderId);
  }

  @Post('folders/:folderId/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (isAllowedImageMimeType(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only JPEG, PNG, GIF, and WebP images are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  uploadImage(
    @Request() req: AuthenticatedRequest,
    @Param('folderId') folderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('displayName') displayName: string,
  ) {
    validateImageFile(file);
    return this.mediaService.uploadImage(
      req.user.id,
      folderId,
      file,
      displayName,
    );
  }

  @Get('folders/:folderId/images')
  getImages(
    @Request() req: AuthenticatedRequest,
    @Param('folderId') folderId: string,
  ) {
    return this.mediaService.getImages(req.user.id, folderId);
  }

  @Get('images/:imageId')
  getImage(
    @Request() req: AuthenticatedRequest,
    @Param('imageId') imageId: string,
  ) {
    return this.mediaService.getImage(req.user.id, imageId);
  }

  @Delete('images/:imageId')
  deleteImage(
    @Request() req: AuthenticatedRequest,
    @Param('imageId') imageId: string,
  ) {
    return this.mediaService.deleteImage(req.user.id, imageId);
  }
}
