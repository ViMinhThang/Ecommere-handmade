import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

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

type MiddlewareArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

const FIND_ACTIONS = ['findUnique', 'findFirst', 'findMany'];

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      const model = params.model?.toLowerCase();
      const isSoftDeleteModel = model
        ? SOFT_DELETE_MODELS.includes(model)
        : false;

      if (isSoftDeleteModel) {
        const args = (params.args ?? {}) as unknown as MiddlewareArgs;

        if (FIND_ACTIONS.includes(params.action)) {
          const where = args.where ?? {};
          if (!Object.prototype.hasOwnProperty.call(where, 'deletedAt')) {
            args.where = { ...where, deletedAt: null };
            params.args = args;
          }
        }

        if (params.action === 'delete') {
          params.action = 'update';
          params.args = {
            data: { deletedAt: new Date() },
            where: args.where,
          };
        }

        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          params.args = {
            data: { deletedAt: new Date() },
            where: args.where,
          };
        }
      }

      const result: unknown = await next(params);
      return result;
    });

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
