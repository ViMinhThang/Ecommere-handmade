import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const platformSetting = {
    upsert: jest.fn(),
  };
  const prisma = { platformSetting } as unknown as PrismaService;
  let service: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PLATFORM_COMMISSION_BPS;
    service = new SettingsService(prisma);
  });

  it('creates the singleton setting with env commission fallback', async () => {
    process.env.PLATFORM_COMMISSION_BPS = '1250';
    platformSetting.upsert.mockResolvedValue({
      id: 'platform',
      platformName: 'HandCraft Market',
      platformDescription: 'Marketplace sản phẩm thủ công và quà tặng handmade',
      commissionBps: 1250,
    });

    await service.getPlatformSettings();

    expect(platformSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'platform' },
        create: expect.objectContaining({ commissionBps: 1250 }),
      }),
    );
    expect(service.getPlatformCommissionBps()).toBe(1250);
  });

  it('updates cached commission for future orders only', async () => {
    platformSetting.upsert.mockResolvedValue({
      id: 'platform',
      platformName: 'Maker Market',
      platformDescription: 'Bộ sưu tập sản phẩm thủ công tuyển chọn',
      commissionBps: 1750,
    });

    await service.updatePlatformSettings(
      {
        platformName: 'Maker Market',
        platformDescription: 'Bộ sưu tập sản phẩm thủ công tuyển chọn',
        commissionBps: 1750,
      },
      'admin_1',
    );

    expect(service.getPlatformCommissionBps()).toBe(1750);
    expect(platformSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ updatedById: 'admin_1' }),
      }),
    );
  });
});
