import { Module } from '@nestjs/common';
import { CustomOrderQuoteTemplatesController } from './custom-order-quote-templates.controller';
import { CustomOrderQuoteTemplatesService } from './custom-order-quote-templates.service';

@Module({
  controllers: [CustomOrderQuoteTemplatesController],
  providers: [CustomOrderQuoteTemplatesService],
  exports: [CustomOrderQuoteTemplatesService],
})
export class CustomOrderQuoteTemplatesModule {}
