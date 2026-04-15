import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
export declare class MediaService {
    private prisma;
    constructor(prisma: PrismaService);
    createFolder(userId: string, createFolderDto: CreateFolderDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    getFolders(userId: string): Promise<({
        _count: {
            images: number;
        };
    } & {
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    })[]>;
    getFolder(userId: string, folderId: string): Promise<{
        images: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            displayName: string;
            path: string;
            folderId: string;
        }[];
    } & {
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    updateFolder(userId: string, folderId: string, updateFolderDto: UpdateFolderDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    deleteFolder(userId: string, folderId: string): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    uploadImage(userId: string, folderId: string, file: Express.Multer.File, displayName: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        displayName: string;
        path: string;
        folderId: string;
    }>;
    getImages(userId: string, folderId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        displayName: string;
        path: string;
        folderId: string;
    }[]>;
    deleteImage(userId: string, imageId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        displayName: string;
        path: string;
        folderId: string;
    }>;
    getImage(userId: string, imageId: string): Promise<{
        folder: {
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
        };
    } & {
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        displayName: string;
        path: string;
        folderId: string;
    }>;
}
