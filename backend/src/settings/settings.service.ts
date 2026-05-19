import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';

const PLATFORM_SETTINGS_ID = 'platform';
const DEFAULT_PLATFORM_NAME = 'HandCraft Market';
const DEFAULT_PLATFORM_DESCRIPTION = 'Marketplace for handmade products';
const DEFAULT_PLATFORM_COMMISSION_BPS = 1000;

@Injectable()
export class SettingsService implements OnModuleInit {
  private cachedCommissionBps = this.getEnvCommissionBps();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensurePlatformSettings();
  }

  getPlatformCommissionBps() {
    return this.cachedCommissionBps;
  }

  async getPlatformSettings() {
    return this.ensurePlatformSettings();
  }

  async updatePlatformSettings(
    data: UpdatePlatformSettingsDto,
    updatedById?: string,
  ) {
    const settings = await this.prisma.platformSetting.upsert({
      where: { id: PLATFORM_SETTINGS_ID },
      update: {
        ...(data.platformName !== undefined
          ? { platformName: data.platformName.trim() }
          : {}),
        ...(data.platformDescription !== undefined
          ? { platformDescription: data.platformDescription.trim() }
          : {}),
        ...(data.commissionBps !== undefined
          ? { commissionBps: data.commissionBps }
          : {}),
        updatedById,
      },
      create: {
        id: PLATFORM_SETTINGS_ID,
        platformName: data.platformName?.trim() || DEFAULT_PLATFORM_NAME,
        platformDescription:
          data.platformDescription?.trim() || DEFAULT_PLATFORM_DESCRIPTION,
        commissionBps: data.commissionBps ?? this.getEnvCommissionBps(),
        updatedById,
      },
    });

    this.cachedCommissionBps = this.normalizeCommissionBps(
      settings.commissionBps,
    );

    return settings;
  }

  private async ensurePlatformSettings() {
    const settings = await this.prisma.platformSetting.upsert({
      where: { id: PLATFORM_SETTINGS_ID },
      update: {},
      create: {
        id: PLATFORM_SETTINGS_ID,
        platformName:
          process.env.PLATFORM_NAME?.trim() || DEFAULT_PLATFORM_NAME,
        platformDescription:
          process.env.PLATFORM_DESCRIPTION?.trim() ||
          DEFAULT_PLATFORM_DESCRIPTION,
        commissionBps: this.getEnvCommissionBps(),
      },
    });

    this.cachedCommissionBps = this.normalizeCommissionBps(
      settings.commissionBps,
    );

    return settings;
  }

  private getEnvCommissionBps() {
    return this.normalizeCommissionBps(
      Number(process.env.PLATFORM_COMMISSION_BPS),
    );
  }

  private normalizeCommissionBps(value: number) {
    if (!Number.isFinite(value) || value < 0) {
      return DEFAULT_PLATFORM_COMMISSION_BPS;
    }

    return Math.min(Math.floor(value), 10000);
  }
}
