import { PartialType } from '@nestjs/mapped-types';
import { CreateHomepageFeaturedProductDto } from './create-homepage-featured-product.dto';

export class UpdateHomepageFeaturedProductDto extends PartialType(
  CreateHomepageFeaturedProductDto,
) {}
