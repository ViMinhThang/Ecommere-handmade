import { Module } from '@nestjs/common';
import { FlashSalesModule } from '../flash-sales/flash-sales.module';
import {
  AdminHomepageController,
  HomepageController,
} from './homepage.controller';
import { HomepageService } from './homepage.service';

@Module({
  imports: [FlashSalesModule],
  controllers: [HomepageController, AdminHomepageController],
  providers: [HomepageService],
})
export class HomepageModule {}
