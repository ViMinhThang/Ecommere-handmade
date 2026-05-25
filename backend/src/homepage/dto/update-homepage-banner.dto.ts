import { PartialType } from '@nestjs/mapped-types';
import { CreateHomepageBannerDto } from './create-homepage-banner.dto';

export class UpdateHomepageBannerDto extends PartialType(
  CreateHomepageBannerDto,
) {}
