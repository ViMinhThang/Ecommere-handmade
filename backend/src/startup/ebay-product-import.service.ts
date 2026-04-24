import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';

@Injectable()
export class EbayProductImportService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EbayProductImportService.name);
  constructor(private readonly config: ConfigService) {}

  async onApplicationBootstrap() {
    const enabled = this.toBoolean(
      this.config.get<string>('AUTO_IMPORT_PRODUCTS_ON_BOOT'),
      false,
    );
    if (!enabled) return;

    const scriptPath = path.join(
      process.cwd(),
      'crawl',
      'ebay-product-import.js',
    );

    if (!existsSync(scriptPath)) {
      this.logger.warn(
        `Skip eBay import: script not found at ${scriptPath}`,
      );
      return;
    }
    this.logger.log(`Run eBay crawler script: ${scriptPath}`);
    const exitCode = await this.runScript(scriptPath);
    if (exitCode !== 0) {
      this.logger.warn(`eBay crawler exited with code ${exitCode}`);
    }
  }

  private toBoolean(value: string | undefined, fallback: boolean): boolean {
    if (!value) return fallback;
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  private runScript(scriptPath: string): Promise<number> {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [scriptPath], {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: process.env,
      });

      child.on('error', () => resolve(1));
      child.on('close', (code) => resolve(code ?? 1));
    });
  }
}
