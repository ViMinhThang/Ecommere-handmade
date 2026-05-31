import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

// Mock fs module before any imports
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
  existsSync: jest.fn().mockReturnValue(true),
}));

describe('MediaService', () => {
  let service: MediaService;
  let prisma: jest.Mocked<PrismaService>;

  const mockFolder = {
    id: 'folder-1',
    name: 'Test Folder',
    userId: 'user-1',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockImage = {
    id: 'image-1',
    displayName: 'Test Image',
    path: 'user-1/folder-1/test.jpg',
    folderId: 'folder-1',
    deletedAt: null,
    createdAt: new Date(),
    folder: mockFolder,
  };

  beforeEach(async () => {
    const mockPrisma = {
      imageFolder: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      image: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFolder', () => {
    it('should create a folder', async () => {
      prisma.imageFolder.create.mockResolvedValue(mockFolder);

      const result = await service.createFolder('user-1', {
        name: 'Test Folder',
      });

      expect(result).toEqual(mockFolder);
      expect(prisma.imageFolder.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Folder',
          userId: 'user-1',
        },
      });
    });
  });

  describe('getFolders', () => {
    it('should return folders with image count', async () => {
      prisma.imageFolder.findMany.mockResolvedValue([
        { ...mockFolder, _count: { images: 5 } },
      ]);

      const result = await service.getFolders('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]._count.images).toBe(5);
      expect(prisma.imageFolder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', deletedAt: null },
        }),
      );
    });

    it('should only return non-deleted folders', async () => {
      prisma.imageFolder.findMany.mockResolvedValue([]);

      await service.getFolders('user-1');

      expect(prisma.imageFolder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('getFolder', () => {
    it('should return folder with images', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue({
        ...mockFolder,
        images: [mockImage],
      });

      const result = await service.getFolder('user-1', 'folder-1');

      expect(result.images).toHaveLength(1);
      expect(prisma.imageFolder.findFirst).toHaveBeenCalledWith({
        where: { id: 'folder-1', userId: 'user-1', deletedAt: null },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if folder not found', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(null);

      await expect(
        service.getFolder('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if folder belongs to another user', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(null);

      await expect(
        service.getFolder('user-2', 'folder-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFolder', () => {
    it('should update folder name', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(mockFolder);
      prisma.imageFolder.update.mockResolvedValue({
        ...mockFolder,
        name: 'Updated Folder',
      });

      const result = await service.updateFolder('user-1', 'folder-1', {
        name: 'Updated Folder',
      });

      expect(result.name).toBe('Updated Folder');
      expect(prisma.imageFolder.update).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
        data: { name: 'Updated Folder' },
      });
    });

    it('should throw NotFoundException if folder not found', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(null);

      await expect(
        service.updateFolder('user-1', 'nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check ownership before update', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(null);

      await expect(
        service.updateFolder('user-2', 'folder-1', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(mockFolder);
      prisma.imageFolder.delete.mockResolvedValue(mockFolder);

      const result = await service.deleteFolder('user-1', 'folder-1');

      expect(result).toEqual(mockFolder);
      expect(prisma.imageFolder.delete).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
      });
    });

    it('should throw NotFoundException if folder not found', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteFolder('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check ownership before delete', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteFolder('user-2', 'folder-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadImage', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('should upload image to folder', async () => {
      const fs = require('fs');
      prisma.imageFolder.findFirst.mockResolvedValue(mockFolder);
      prisma.image.create.mockResolvedValue(mockImage);

      const result = await service.uploadImage(
        'user-1',
        'folder-1',
        mockFile,
        'Test Image',
      );

      expect(result).toEqual(mockImage);
      expect(fs.promises.mkdir).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(prisma.image.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          displayName: 'Test Image',
          folderId: 'folder-1',
        }),
      });
    });

    it('should throw NotFoundException if folder not found', async () => {
      const fs = require('fs');
      prisma.imageFolder.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadImage('user-1', 'nonexistent', mockFile, 'Test'),
      ).rejects.toThrow(NotFoundException);
      expect(fs.promises.mkdir).not.toHaveBeenCalled();
    });

    it('should check folder ownership before upload', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadImage('user-2', 'folder-1', mockFile, 'Test'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create upload directory recursively', async () => {
      const fs = require('fs');
      prisma.imageFolder.findFirst.mockResolvedValue(mockFolder);
      prisma.image.create.mockResolvedValue(mockImage);

      await service.uploadImage('user-1', 'folder-1', mockFile, 'Test');

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/uploads[\/\\]user-1[\/\\]folder-1/),
        { recursive: true },
      );
    });
  });

  describe('getImages', () => {
    it('should return images in folder', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(mockFolder);
      prisma.image.findMany.mockResolvedValue([mockImage]);

      const result = await service.getImages('user-1', 'folder-1');

      expect(result).toHaveLength(1);
      expect(prisma.image.findMany).toHaveBeenCalledWith({
        where: { folderId: 'folder-1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if folder not found', async () => {
      prisma.imageFolder.findFirst.mockResolvedValue(null);

      await expect(
        service.getImages('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteImage', () => {
    it('should delete image', async () => {
      prisma.image.findUnique.mockResolvedValue(mockImage);
      prisma.image.delete.mockResolvedValue(mockImage);

      const result = await service.deleteImage('user-1', 'image-1');

      expect(result).toEqual(mockImage);
      expect(prisma.image.delete).toHaveBeenCalledWith({
        where: { id: 'image-1' },
      });
    });

    it('should throw NotFoundException if image not found', async () => {
      prisma.image.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteImage('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check ownership via folder before delete', async () => {
      prisma.image.findUnique.mockResolvedValue({
        ...mockImage,
        folder: { ...mockFolder, userId: 'user-2' },
      });

      await expect(
        service.deleteImage('user-1', 'image-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getImage', () => {
    it('should return image', async () => {
      prisma.image.findUnique.mockResolvedValue(mockImage);

      const result = await service.getImage('user-1', 'image-1');

      expect(result).toEqual(mockImage);
    });

    it('should throw NotFoundException if image not found', async () => {
      prisma.image.findUnique.mockResolvedValue(null);

      await expect(service.getImage('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should check ownership via folder', async () => {
      prisma.image.findUnique.mockResolvedValue({
        ...mockImage,
        folder: { ...mockFolder, userId: 'user-2' },
      });

      await expect(service.getImage('user-1', 'image-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
