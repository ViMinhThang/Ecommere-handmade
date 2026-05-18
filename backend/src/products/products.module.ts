import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { FlashSalesModule } from '../flash-sales/flash-sales.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [FlashSalesModule, NotificationsModule],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
