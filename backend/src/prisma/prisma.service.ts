import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

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
  'cart',
];

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    this.$use(async (params, next) => {
      if (
        SOFT_DELETE_MODELS.includes(params.model?.toLowerCase() || '') &&
        (params.action === 'findUnique' ||
          params.action === 'findFirst' ||
          params.action === 'findMany')
      ) {
        if (!params.args.where?.deletedAt) {
          params.args.where = { ...params.args.where, deletedAt: null };
        }
      }

      if (
        SOFT_DELETE_MODELS.includes(params.model?.toLowerCase() || '') &&
        params.action === 'delete'
      ) {
        params.action = 'update';
        params.args = {
          data: { deletedAt: new Date() },
          where: params.args.where,
        };
      }

      if (
        SOFT_DELETE_MODELS.includes(params.model?.toLowerCase() || '') &&
        params.action === 'deleteMany'
      ) {
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
}
