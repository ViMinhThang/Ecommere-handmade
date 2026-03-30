import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { CreateImageDto } from './dto/image.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async createFolder(userId: string, createFolderDto: CreateFolderDto) {
    return this.prisma.imageFolder.create({
      data: {
        name: createFolderDto.name,
        userId,
      },
    });
  }

  async getFolders(userId: string) {
    return this.prisma.imageFolder.findMany({
      where: { userId, deleted: false },
      include: {
        _count: {
          select: { images: { where: { deleted: false } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFolder(userId: string, folderId: string) {
    const folder = await this.prisma.imageFolder.findFirst({
      where: { id: folderId, userId, deleted: false },
      include: {
        images: {
          where: { deleted: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }

  async updateFolder(userId: string, folderId: string, updateFolderDto: UpdateFolderDto) {
    const folder = await this.prisma.imageFolder.findFirst({
      where: { id: folderId, userId },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return this.prisma.imageFolder.update({
      where: { id: folderId },
      data: updateFolderDto,
    });
  }

  async deleteFolder(userId: string, folderId: string) {
    const folder = await this.prisma.imageFolder.findFirst({
      where: { id: folderId, userId },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return this.prisma.imageFolder.update({
      where: { id: folderId },
      data: { deleted: true },
    });
  }

  async uploadImage(userId: string, folderId: string, file: Express.Multer.File, displayName: string) {
    const folder = await this.prisma.imageFolder.findFirst({
      where: { id: folderId, userId, deleted: false },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const uploadPath = path.join('uploads', userId, folderId);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadPath, fileName);
    fs.writeFileSync(filePath, file.buffer);

    return this.prisma.image.create({
      data: {
        displayName,
        path: `${userId}/${folderId}/${fileName}`,
        folderId,
      },
    });
  }

  async getImages(userId: string, folderId: string) {
    const folder = await this.prisma.imageFolder.findFirst({
      where: { id: folderId, userId, deleted: false },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return this.prisma.image.findMany({
      where: { folderId, deleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteImage(userId: string, imageId: string) {
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      include: { folder: true },
    });
    if (!image || image.folder.userId !== userId) {
      throw new NotFoundException('Image not found');
    }

    return this.prisma.image.update({
      where: { id: imageId },
      data: { deleted: true },
    });
  }

  async getImage(userId: string, imageId: string) {
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      include: { folder: true },
    });
    if (!image || image.folder.userId !== userId || image.deleted) {
      throw new NotFoundException('Image not found');
    }
    return image;
  }
}
