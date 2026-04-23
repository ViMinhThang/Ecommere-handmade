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

const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|jpg|png|gif|webp)$/;
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

function validateFileContent(file: Express.Multer.File): void {
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

  throw new BadRequestException('File content does not match declared type');
}

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
        if (ALLOWED_IMAGE_TYPES.test(file.mimetype)) {
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
    validateFileContent(file);
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
