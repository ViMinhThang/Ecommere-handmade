"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const prisma_module_1 = require("./prisma/prisma.module");
const users_module_1 = require("./users/users.module");
const categories_module_1 = require("./categories/categories.module");
const products_module_1 = require("./products/products.module");
const media_module_1 = require("./media/media.module");
const auth_module_1 = require("./auth/auth.module");
const vouchers_module_1 = require("./vouchers/vouchers.module");
const flash_sales_module_1 = require("./flash-sales/flash-sales.module");
const cart_module_1 = require("./cart/cart.module");
const chat_module_1 = require("./chat/chat.module");
const stripe_module_1 = require("./stripe/stripe.module");
const orders_module_1 = require("./orders/orders.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 10,
                },
            ]),
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            categories_module_1.CategoriesModule,
            products_module_1.ProductsModule,
            media_module_1.MediaModule,
            auth_module_1.AuthModule,
            vouchers_module_1.VouchersModule,
            flash_sales_module_1.FlashSalesModule,
            cart_module_1.CartModule,
            chat_module_1.ChatModule,
            stripe_module_1.StripeModule,
            orders_module_1.OrdersModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map