import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseInterceptors, UploadedFile, Headers } from '@nestjs/common';
import { MediaService } from './media.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('folders')
  createFolder(
    @Headers('x-user-id') userId: string,
    @Body() createFolderDto: CreateFolderDto,
  ) {
    return this.mediaService.createFolder(userId, createFolderDto);
  }

  @Get('folders')
  getFolders(@Headers('x-user-id') userId: string) {
    return this.mediaService.getFolders(userId);
  }

  @Get('folders/:folderId')
  getFolder(
    @Headers('x-user-id') userId: string,
    @Param('folderId') folderId: string,
  ) {
    return this.mediaService.getFolder(userId, folderId);
  }

  @Patch('folders/:folderId')
  updateFolder(
    @Headers('x-user-id') userId: string,
    @Param('folderId') folderId: string,
    @Body() updateFolderDto: UpdateFolderDto,
  ) {
    return this.mediaService.updateFolder(userId, folderId, updateFolderDto);
  }

  @Delete('folders/:folderId')
  deleteFolder(
    @Headers('x-user-id') userId: string,
    @Param('folderId') folderId: string,
  ) {
    return this.mediaService.deleteFolder(userId, folderId);
  }

  @Post('folders/:folderId/images')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @Headers('x-user-id') userId: string,
    @Param('folderId') folderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('displayName') displayName: string,
  ) {
    return this.mediaService.uploadImage(userId, folderId, file, displayName);
  }

  @Get('folders/:folderId/images')
  getImages(
    @Headers('x-user-id') userId: string,
    @Param('folderId') folderId: string,
  ) {
    return this.mediaService.getImages(userId, folderId);
  }

  @Get('images/:imageId')
  getImage(
    @Headers('x-user-id') userId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.mediaService.getImage(userId, imageId);
  }

  @Delete('images/:imageId')
  deleteImage(
    @Headers('x-user-id') userId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.mediaService.deleteImage(userId, imageId);
  }
}
