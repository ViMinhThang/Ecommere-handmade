import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { MediaModule } from './media/media.module';
import { AuthModule } from './auth/auth.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { FlashSalesModule } from './flash-sales/flash-sales.module';
import { CartModule } from './cart/cart.module';
import { ChatModule } from './chat/chat.module';
import { StripeModule } from './stripe/stripe.module';
import { OrdersModule } from './orders/orders.module';
import { CustomOrdersModule } from './custom-orders/custom-orders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ProductQuestionsModule } from './product-questions/product-questions.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { EbayProductImportService } from './startup/ebay-product-import.service';
import { SettingsModule } from './settings/settings.module';
import { PaymentsModule } from './payments/payments.module';
import { RewardsModule } from './rewards/rewards.module';
import { ReportsModule } from './reports/reports.module';
import { CommissionsModule } from './commissions/commissions.module';
import { CustomOrderQuoteTemplatesModule } from './custom-order-quote-templates/custom-order-quote-templates.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HomepageModule } from './homepage/homepage.module';

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: parsePositiveInt(
            configService.get<string>('THROTTLE_TTL_MS'),
            60000,
          ),
          limit: parsePositiveInt(
            configService.get<string>('THROTTLE_LIMIT'),
            300,
          ),
        },
      ],
    }),
    PrismaModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    MediaModule,
    AuthModule,
    VouchersModule,
    FlashSalesModule,
    CartModule,
    ChatModule,
    StripeModule,
    OrdersModule,
    CustomOrdersModule,
    AnalyticsModule,
    ReviewsModule,
    ProductQuestionsModule,
    WishlistModule,
    SettingsModule,
    PaymentsModule,
    RewardsModule,
    ReportsModule,
    CommissionsModule,
    CustomOrderQuoteTemplatesModule,
    NotificationsModule,
    HomepageModule,
  ],
  controllers: [AppController],
  providers: [
    EbayProductImportService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
