import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductQuestionsController } from './product-questions.controller';
import { ProductQuestionsService } from './product-questions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductQuestionsController],
  providers: [ProductQuestionsService],
})
export class ProductQuestionsModule {}
