import { Test, TestingModule } from '@nestjs/testing';
import { CustomOrdersController } from './custom-orders.controller';

describe('CustomOrdersController', () => {
  let controller: CustomOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomOrdersController],
    }).compile();

    controller = module.get<CustomOrdersController>(CustomOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
