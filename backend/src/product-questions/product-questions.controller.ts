import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { AnswerProductQuestionDto } from './dto/answer-product-question.dto';
import { CreateProductQuestionDto } from './dto/create-product-question.dto';
import { ListProductQuestionsQueryDto } from './dto/list-product-questions-query.dto';
import { ProductQuestionsService } from './product-questions.service';

@Controller('products')
export class ProductQuestionsController {
  constructor(
    private readonly productQuestionsService: ProductQuestionsService,
  ) {}

  @Get(':productId/questions')
  listByProduct(
    @Param('productId') productId: string,
    @Query() query: ListProductQuestionsQueryDto,
  ) {
    return this.productQuestionsService.listByProduct(productId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':productId/questions')
  createQuestion(
    @Request() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: CreateProductQuestionDto,
  ) {
    return this.productQuestionsService.createQuestion(
      req.user.id,
      productId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  @Patch('questions/:questionId/answer')
  answerQuestion(
    @Request() req: AuthenticatedRequest,
    @Param('questionId') questionId: string,
    @Body() dto: AnswerProductQuestionDto,
  ) {
    return this.productQuestionsService.answerQuestion(
      req.user.id,
      req.user.roles,
      questionId,
      dto,
    );
  }
}
