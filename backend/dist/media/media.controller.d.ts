import { MediaService } from './media.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    createFolder(req: AuthenticatedRequest, createFolderDto: CreateFolderDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    getFolders(req: AuthenticatedRequest): Promise<({
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
    getFolder(req: AuthenticatedRequest, folderId: string): Promise<{
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
    updateFolder(req: AuthenticatedRequest, folderId: string, updateFolderDto: UpdateFolderDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    deleteFolder(req: AuthenticatedRequest, folderId: string): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    uploadImage(req: AuthenticatedRequest, folderId: string, file: Express.Multer.File, displayName: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        displayName: string;
        path: string;
        folderId: string;
    }>;
    getImages(req: AuthenticatedRequest, folderId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        displayName: string;
        path: string;
        folderId: string;
    }[]>;
    getImage(req: AuthenticatedRequest, imageId: string): Promise<{
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
    deleteImage(req: AuthenticatedRequest, imageId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        displayName: string;
        path: string;
        folderId: string;
    }>;
}
