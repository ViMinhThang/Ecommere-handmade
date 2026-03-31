import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { promises as fs } from 'fs';
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
      where: { userId, deletedAt: null },
      include: {
        _count: {
          select: { images: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFolder(userId: string, folderId: string) {
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
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }

  async updateFolder(
    userId: string,
    folderId: string,
    updateFolderDto: UpdateFolderDto,
  ) {
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
    return this.prisma.imageFolder.delete({
      where: { id: folderId },
    });
  }

  async uploadImage(
    userId: string,
    folderId: string,
    file: Express.Multer.File,
    displayName: string,
  ) {
    const folder = await this.prisma.imageFolder.findFirst({
      where: { id: folderId, userId, deletedAt: null },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const uploadPath = path.join('uploads', userId, folderId);
    await fs.mkdir(uploadPath, { recursive: true });

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = path.join(uploadPath, fileName);
    await fs.writeFile(filePath, file.buffer);

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
      where: { id: folderId, userId, deletedAt: null },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return this.prisma.image.findMany({
      where: { folderId, deletedAt: null },
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

    return this.prisma.image.delete({
      where: { id: imageId },
    });
  }

  async getImage(userId: string, imageId: string) {
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      include: { folder: true },
    });
    if (!image || image.folder.userId !== userId) {
      throw new NotFoundException('Image not found');
    }
    return image;
  }
}
