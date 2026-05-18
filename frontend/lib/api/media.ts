import { apiClient, API_BASE_URL, getApiErrorMessage } from './client';
import type { ImageFolder, Image } from '@/types';

export interface CreateFolderDto {
  name: string;
}

export interface UpdateFolderDto {
  name: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function getMediaUrl(path: string) {
  if (!path) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    return path;
  }

  const normalizedPath = path.replace(/^\/+/, "");
  const baseUrl = API_BASE_URL.replace(/\/v\d+$/, "");
  if (normalizedPath.startsWith("uploads/")) {
    return `${baseUrl}/${normalizedPath}`;
  }

  return `${baseUrl}/uploads/${normalizedPath}`;
}

export const getImageUrl = getMediaUrl;

export const mediaApi = {
  getFolders: (userId: string) => apiClient.get<ImageFolder[]>(`/media/folders?userId=${userId}`),

  getFolder: (folderId: string) => apiClient.get<ImageFolder>(`/media/folders/${folderId}`),

  createFolder: (userId: string, data: CreateFolderDto) => 
    apiClient.post<ImageFolder>(`/media/folders?userId=${userId}`, data),

  updateFolder: (userId: string, folderId: string, data: UpdateFolderDto) =>
    apiClient.patch<ImageFolder>(`/media/folders/${folderId}?userId=${userId}`, data),

  deleteFolder: (userId: string, folderId: string) => 
    apiClient.delete<void>(`/media/folders/${folderId}?userId=${userId}`),

  uploadImage: async (folderId: string, file: File, displayName: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("displayName", displayName);

    const response = await fetch(`${API_BASE_URL}/media/folders/${folderId}/images`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to upload image" }));
      throw new Error(getApiErrorMessage(error, "Failed to upload image"));
    }

    return response.json();
  },

  getImages: (folderId: string) => apiClient.get<Image[]>(`/media/folders/${folderId}/images`),

  deleteImage: (imageId: string) => apiClient.delete<void>(`/media/images/${imageId}`),

  getMediaUrl,
  getImageUrl,
};
