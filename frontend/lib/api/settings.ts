import { apiClient } from "./client";

export interface PlatformSettings {
  id: string;
  platformName: string;
  platformDescription: string;
  commissionBps: number;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePlatformSettingsInput {
  platformName?: string;
  platformDescription?: string;
  commissionBps?: number;
}

export const settingsApi = {
  getPlatform: () => apiClient.get<PlatformSettings>("/settings/platform"),
  updatePlatform: (data: UpdatePlatformSettingsInput) =>
    apiClient.patch<PlatformSettings>("/settings/platform", data),
};
