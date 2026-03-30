import { MediaService } from './media.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    createFolder(userId: string, createFolderDto: CreateFolderDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deleted: boolean;
    }>;
    getFolders(userId: string): Promise<({
        _count: {
            images: number;
        };
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deleted: boolean;
    })[]>;
    getFolder(userId: string, folderId: string): Promise<{
        images: {
            id: string;
            createdAt: Date;
            displayName: string;
            deleted: boolean;
            path: string;
            folderId: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deleted: boolean;
    }>;
    updateFolder(userId: string, folderId: string, updateFolderDto: UpdateFolderDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deleted: boolean;
    }>;
    deleteFolder(userId: string, folderId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deleted: boolean;
    }>;
    uploadImage(userId: string, folderId: string, file: Express.Multer.File, displayName: string): Promise<{
        id: string;
        createdAt: Date;
        displayName: string;
        deleted: boolean;
        path: string;
        folderId: string;
    }>;
    getImages(userId: string, folderId: string): Promise<{
        id: string;
        createdAt: Date;
        displayName: string;
        deleted: boolean;
        path: string;
        folderId: string;
    }[]>;
    getImage(userId: string, imageId: string): Promise<{
        folder: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            deleted: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        displayName: string;
        deleted: boolean;
        path: string;
        folderId: string;
    }>;
    deleteImage(userId: string, imageId: string): Promise<{
        id: string;
        createdAt: Date;
        displayName: string;
        deleted: boolean;
        path: string;
        folderId: string;
    }>;
}
