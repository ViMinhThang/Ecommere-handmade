import { PartialType } from '@nestjs/mapped-types';
import { CreateGiftWrapTierDto } from './create-gift-wrap-tier.dto';

export class UpdateGiftWrapTierDto extends PartialType(CreateGiftWrapTierDto) {}
