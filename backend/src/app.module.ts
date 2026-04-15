import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
