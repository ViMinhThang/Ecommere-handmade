import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProductQuestionStatus,
  ProductStatus,
  Role,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductQuestionDto } from './dto/create-product-question.dto';
import { AnswerProductQuestionDto } from './dto/answer-product-question.dto';
import { ListProductQuestionsQueryDto } from './dto/list-product-questions-query.dto';

type ProductQuestionWithRelations = Prisma.ProductQuestionGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        avatar: true;
      };
    };
    answeredBy: {
      select: {
        id: true;
        name: true;
        avatar: true;
        roles: true;
      };
    };
  };
}>;

@Injectable()
export class ProductQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLimit(limit?: number) {
    if (!limit || !Number.isFinite(limit)) {
      return 10;
    }

    return Math.min(Math.max(Math.floor(limit), 1), 20);
  }

  private getPrimaryRole(roles: Role[]) {
    if (roles.includes(Role.ROLE_ADMIN)) {
      return Role.ROLE_ADMIN;
    }

    if (roles.includes(Role.ROLE_SELLER)) {
      return Role.ROLE_SELLER;
    }

    return Role.ROLE_USER;
  }

  private validatePlainText(input: string, fieldName: string) {
    if (/[<>]/.test(input)) {
      throw new BadRequestException(
        `${fieldName} must not contain HTML or script tags`,
      );
    }
  }

  private async assertQuestionableProduct(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        status: ProductStatus.APPROVED,
      },
      select: {
        id: true,
        sellerId: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private mapQuestion(question: ProductQuestionWithRelations) {
    return {
      id: question.id,
      productId: question.productId,
      question: question.question,
      answer: question.answer,
      answeredAt: question.answeredAt,
      createdAt: question.createdAt,
      user: question.user,
      answeredBy: question.answeredBy
        ? {
            id: question.answeredBy.id,
            name: question.answeredBy.name,
            avatar: question.answeredBy.avatar,
            role: this.getPrimaryRole(question.answeredBy.roles),
          }
        : null,
    };
  }

  async listByProduct(
    productId: string,
    query: ListProductQuestionsQueryDto,
  ) {
    await this.assertQuestionableProduct(productId);

    const page = Math.max(query.page ?? 1, 1);
    const limit = this.normalizeLimit(query.limit);
    const skip = (page - 1) * limit;
    const where = {
      productId,
      status: ProductQuestionStatus.PUBLISHED,
    };

    const [questions, total] = await Promise.all([
      this.prisma.productQuestion.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          answeredBy: {
            select: {
              id: true,
              name: true,
              avatar: true,
              roles: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.productQuestion.count({ where }),
    ]);

    return {
      data: questions.map((question) => this.mapQuestion(question)),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async createQuestion(
    userId: string,
    productId: string,
    dto: CreateProductQuestionDto,
  ) {
    await this.assertQuestionableProduct(productId);
    this.validatePlainText(dto.question, 'Question');

    const question = await this.prisma.productQuestion.create({
      data: {
        productId,
        userId,
        question: dto.question,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        answeredBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            roles: true,
          },
        },
      },
    });

    return this.mapQuestion(question);
  }

  async answerQuestion(
    userId: string,
    userRoles: string[],
    questionId: string,
    dto: AnswerProductQuestionDto,
  ) {
    this.validatePlainText(dto.answer, 'Answer');

    const existingQuestion = await this.prisma.productQuestion.findUnique({
      where: { id: questionId },
      include: {
        product: {
          select: {
            sellerId: true,
          },
        },
      },
    });

    if (!existingQuestion || existingQuestion.status === ProductQuestionStatus.DELETED) {
      throw new NotFoundException('Question not found');
    }

    const isAdmin = userRoles.includes(Role.ROLE_ADMIN);
    const isOwnerSeller =
      userRoles.includes(Role.ROLE_SELLER) &&
      existingQuestion.product.sellerId === userId;

    if (!isAdmin && !isOwnerSeller) {
      throw new ForbiddenException(
        'You do not have permission to answer this question',
      );
    }

    const updatedQuestion = await this.prisma.productQuestion.update({
      where: { id: questionId },
      data: {
        answer: dto.answer,
        answeredAt: new Date(),
        answeredById: userId,
        status: ProductQuestionStatus.PUBLISHED,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        answeredBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            roles: true,
          },
        },
      },
    });

    return this.mapQuestion(updatedQuestion);
  }
}
