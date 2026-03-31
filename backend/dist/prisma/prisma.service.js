"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const SOFT_DELETE_MODELS = [
    'user',
    'address',
    'category',
    'product',
    'productImage',
    'imageFolder',
    'image',
    'inventoryLog',
    'voucher',
    'voucherRange',
    'flashSale',
    'flashSaleCategory',
    'flashSaleRange',
];
let PrismaService = class PrismaService extends client_1.PrismaClient {
    async onModuleInit() {
        this.$use(async (params, next) => {
            if (SOFT_DELETE_MODELS.includes(params.model?.toLowerCase() || '') &&
                (params.action === 'findUnique' ||
                    params.action === 'findFirst' ||
                    params.action === 'findMany')) {
                if (!params.args.where?.deletedAt) {
                    params.args.where = { ...params.args.where, deletedAt: null };
                }
            }
            if (SOFT_DELETE_MODELS.includes(params.model?.toLowerCase() || '') &&
                params.action === 'delete') {
                params.action = 'update';
                params.args = {
                    data: { deletedAt: new Date() },
                    where: params.args.where,
                };
            }
            if (SOFT_DELETE_MODELS.includes(params.model?.toLowerCase() || '') &&
                params.action === 'deleteMany') {
                params.action = 'updateMany';
                params.args = {
                    data: { deletedAt: new Date() },
                    where: params.args.where,
                };
            }
            return next(params);
        });
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map