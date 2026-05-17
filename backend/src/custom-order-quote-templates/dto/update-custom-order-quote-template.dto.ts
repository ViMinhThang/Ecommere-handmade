import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomOrderQuoteTemplateDto } from './create-custom-order-quote-template.dto';

export class UpdateCustomOrderQuoteTemplateDto extends PartialType(
  CreateCustomOrderQuoteTemplateDto,
) {}
