import { Test, TestingModule } from '@nestjs/testing';
import { CustomOrdersService } from './custom-orders.service';

describe('CustomOrdersService', () => {
  let service: CustomOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomOrdersService],
    }).compile();

    service = module.get<CustomOrdersService>(CustomOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
