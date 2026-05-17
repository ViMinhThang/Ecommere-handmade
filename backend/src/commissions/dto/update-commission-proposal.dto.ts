import { PartialType } from '@nestjs/mapped-types';
import { CreateCommissionProposalDto } from './create-commission-proposal.dto';

export class UpdateCommissionProposalDto extends PartialType(
  CreateCommissionProposalDto,
) {}
