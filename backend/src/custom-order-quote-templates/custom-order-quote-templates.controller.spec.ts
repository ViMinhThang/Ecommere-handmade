import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { CustomOrderQuoteTemplatesController } from './custom-order-quote-templates.controller';
import { CustomOrderQuoteTemplatesService } from './custom-order-quote-templates.service';

describe('CustomOrderQuoteTemplatesController', () => {
  let controller: CustomOrderQuoteTemplatesController;

  const service = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const request = {
    user: {
      id: 'seller-1',
      email: 'seller@example.com',
      roles: ['ROLE_SELLER'],
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomOrderQuoteTemplatesController],
      providers: [
        { provide: CustomOrderQuoteTemplatesService, useValue: service },
      ],
    }).compile();

    controller = module.get(CustomOrderQuoteTemplatesController);
  });

  it('scopes list requests to the authenticated seller', async () => {
    service.findAll.mockResolvedValue([]);

    await controller.findAll(request);

    expect(service.findAll).toHaveBeenCalledWith('seller-1');
  });

  it('scopes create requests to the authenticated seller', async () => {
    service.create.mockResolvedValue({ id: 'template-1' });
    const dto = { name: 'Template', title: 'Quote' };

    await controller.create(request, dto);

    expect(service.create).toHaveBeenCalledWith('seller-1', dto);
  });

  it('scopes update requests to the authenticated seller', async () => {
    service.update.mockResolvedValue({ id: 'template-1' });
    const dto = { title: 'Updated quote' };

    await controller.update(request, 'template-1', dto);

    expect(service.update).toHaveBeenCalledWith('template-1', 'seller-1', dto);
  });

  it('scopes delete requests to the authenticated seller', async () => {
    service.remove.mockResolvedValue({ id: 'template-1' });

    await controller.remove(request, 'template-1');

    expect(service.remove).toHaveBeenCalledWith('template-1', 'seller-1');
  });
});
