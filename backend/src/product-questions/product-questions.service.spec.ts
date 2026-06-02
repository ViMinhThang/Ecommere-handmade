import { Test, TestingModule } from '@nestjs/testing';
import { ProductQuestionsService } from './product-questions.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ProductStatus,
  CategoryStatus,
  ProductQuestionStatus,
  Role,
} from '@prisma/client';

describe('ProductQuestionsService', () => {
  let service: ProductQuestionsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockProduct = {
    id: 'product-1',
    sellerId: 'seller-1',
    status: ProductStatus.APPROVED,
    deletedAt: null,
    category: {
      deletedAt: null,
      status: CategoryStatus.ACTIVE,
    },
  };

  const mockQuestion = {
    id: 'question-1',
    productId: 'product-1',
    userId: 'user-1',
    question: 'Is this product available?',
    answer: null,
    answeredAt: null,
    answeredById: null,
    status: ProductQuestionStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-1',
      name: 'Test User',
      avatar: null,
    },
    answeredBy: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      product: {
        findFirst: jest.fn(),
      },
      productQuestion: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductQuestionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductQuestionsService>(ProductQuestionsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listByProduct', () => {
    it('should return paginated questions', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct as any);
      prisma.productQuestion.findMany.mockResolvedValue([mockQuestion]);
      prisma.productQuestion.count.mockResolvedValue(1);

      const result = await service.listByProduct('product-1', {});

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should only return PUBLISHED questions', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct as any);
      prisma.productQuestion.findMany.mockResolvedValue([]);
      prisma.productQuestion.count.mockResolvedValue(0);

      await service.listByProduct('product-1', {});

      expect(prisma.productQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ProductQuestionStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('should normalize limit to max 20', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct as any);
      prisma.productQuestion.findMany.mockResolvedValue([]);
      prisma.productQuestion.count.mockResolvedValue(0);

      await service.listByProduct('product-1', { limit: 100 });

      expect(prisma.productQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        }),
      );
    });

    it('should normalize invalid limit to default 10', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct as any);
      prisma.productQuestion.findMany.mockResolvedValue([]);
      prisma.productQuestion.count.mockResolvedValue(0);

      await service.listByProduct('product-1', { limit: undefined });

      expect(prisma.productQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should use default limit of 10', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct as any);
      prisma.productQuestion.findMany.mockResolvedValue([]);
      prisma.productQuestion.count.mockResolvedValue(0);

      await service.listByProduct('product-1', {});

      expect(prisma.productQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('createQuestion', () => {
    it('should create a question', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.productQuestion.create.mockResolvedValue(mockQuestion);

      const result = await service.createQuestion('user-1', 'product-1', {
        question: 'Is this product available?',
      });

      expect(result).toBeDefined();
      expect(prisma.productQuestion.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          userId: 'user-1',
          question: 'Is this product available?',
        },
        include: expect.any(Object),
      });
    });

    it('should accept question text (trimming handled by DTO)', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.productQuestion.create.mockResolvedValue(mockQuestion);

      await service.createQuestion('user-1', 'product-1', {
        question: 'Is this available?',
      });

      expect(prisma.productQuestion.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          userId: 'user-1',
          question: 'Is this available?',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.createQuestion('user-1', 'nonexistent', {
          question: 'Test question?',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.productQuestion.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not APPROVED', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.createQuestion('user-1', 'pending-product', {
          question: 'Test question?',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject HTML/script tags in question', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(
        service.createQuestion('user-1', 'product-1', {
          question: '<script>alert("xss")</script>',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.productQuestion.create).not.toHaveBeenCalled();
    });

    it('should reject questions with < or > characters', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(
        service.createQuestion('user-1', 'product-1', {
          question: 'Is price < 100?',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createQuestion('user-1', 'product-1', {
          question: 'Is price > 100?',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('answerQuestion', () => {
    it('should allow seller to answer question', async () => {
      const questionWithProduct = {
        ...mockQuestion,
        product: mockProduct,
      };
      prisma.productQuestion.findUnique.mockResolvedValue(
        questionWithProduct as any,
      );
      prisma.productQuestion.update.mockResolvedValue({
        ...mockQuestion,
        answer: 'Yes, it is available',
        answeredById: 'seller-1',
        answeredAt: new Date(),
      });

      const result = await service.answerQuestion(
        'seller-1',
        [Role.ROLE_SELLER],
        'question-1',
        { answer: 'Yes, it is available' },
      );

      expect(result.answer).toBe('Yes, it is available');
      expect(prisma.productQuestion.update).toHaveBeenCalledWith({
        where: { id: 'question-1' },
        data: {
          answer: 'Yes, it is available',
          answeredById: 'seller-1',
          answeredAt: expect.any(Date),
          status: ProductQuestionStatus.PUBLISHED,
        },
        include: expect.any(Object),
      });
    });

    it('should allow admin to answer question', async () => {
      const questionWithProduct = {
        ...mockQuestion,
        product: mockProduct,
      };
      prisma.productQuestion.findUnique.mockResolvedValue(
        questionWithProduct as any,
      );
      prisma.productQuestion.update.mockResolvedValue({
        ...mockQuestion,
        answer: 'Admin answer',
        answeredById: 'admin-1',
      });

      await service.answerQuestion(
        'admin-1',
        [Role.ROLE_USER, Role.ROLE_SELLER, Role.ROLE_ADMIN],
        'question-1',
        { answer: 'Admin answer' },
      );

      expect(prisma.productQuestion.update).toHaveBeenCalledWith({
        where: { id: 'question-1' },
        data: {
          answer: 'Admin answer',
          answeredById: 'admin-1',
          answeredAt: expect.any(Date),
          status: ProductQuestionStatus.PUBLISHED,
        },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException if seller does not own product', async () => {
      const questionWithProduct = {
        ...mockQuestion,
        product: { ...mockProduct, sellerId: 'other-seller' },
      };
      prisma.productQuestion.findUnique.mockResolvedValue(
        questionWithProduct as any,
      );

      await expect(
        service.answerQuestion('seller-1', [Role.ROLE_SELLER], 'question-1', {
          answer: 'Test answer',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.productQuestion.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if question not found', async () => {
      prisma.productQuestion.findUnique.mockResolvedValue(null);

      await expect(
        service.answerQuestion('seller-1', [Role.ROLE_SELLER], 'nonexistent', {
          answer: 'Test answer',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should accept answer text (trimming handled by DTO)', async () => {
      const questionWithProduct = {
        ...mockQuestion,
        product: mockProduct,
      };
      prisma.productQuestion.findUnique.mockResolvedValue(
        questionWithProduct as any,
      );
      prisma.productQuestion.update.mockResolvedValue(mockQuestion);

      await service.answerQuestion(
        'seller-1',
        [Role.ROLE_USER, Role.ROLE_SELLER],
        'question-1',
        { answer: 'Yes, available' },
      );

      expect(prisma.productQuestion.update).toHaveBeenCalledWith({
        where: { id: 'question-1' },
        data: {
          answer: 'Yes, available',
          answeredById: 'seller-1',
          answeredAt: expect.any(Date),
          status: ProductQuestionStatus.PUBLISHED,
        },
        include: expect.any(Object),
      });
    });

    it('should reject HTML/script tags in answer', async () => {
      const questionWithProduct = {
        ...mockQuestion,
        product: mockProduct,
      };
      prisma.productQuestion.findUnique.mockResolvedValue(
        questionWithProduct as any,
      );

      await expect(
        service.answerQuestion('seller-1', [Role.ROLE_SELLER], 'question-1', {
          answer: '<script>alert("xss")</script>',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.productQuestion.update).not.toHaveBeenCalled();
    });

    it('should set status to PUBLISHED when answering', async () => {
      const questionWithProduct = {
        ...mockQuestion,
        product: mockProduct,
      };
      prisma.productQuestion.findUnique.mockResolvedValue(
        questionWithProduct as any,
      );
      prisma.productQuestion.update.mockResolvedValue(mockQuestion);

      await service.answerQuestion(
        'seller-1',
        [Role.ROLE_USER, Role.ROLE_SELLER],
        'question-1',
        { answer: 'Test answer' },
      );

      expect(prisma.productQuestion.update).toHaveBeenCalledWith({
        where: { id: 'question-1' },
        data: {
          answer: 'Test answer',
          answeredById: 'seller-1',
          answeredAt: expect.any(Date),
          status: ProductQuestionStatus.PUBLISHED,
        },
        include: expect.any(Object),
      });
    });
  });
});
