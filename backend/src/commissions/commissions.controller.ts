import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { CommissionsService } from './commissions.service';
import { CreateCommissionPostDto } from './dto/create-commission-post.dto';
import { CreateCommissionProposalDto } from './dto/create-commission-proposal.dto';
import { UpdateCommissionProposalDto } from './dto/update-commission-proposal.dto';

@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Post()
  createPost(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCommissionPostDto,
  ) {
    return this.commissionsService.createPost(req.user.id, dto);
  }

  @Get('my-posts')
  listMyPosts(@Request() req: AuthenticatedRequest) {
    return this.commissionsService.listMyPosts(req.user.id);
  }

  @Get('open')
  @UseGuards(RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  listOpenPosts() {
    return this.commissionsService.listOpenPosts();
  }

  @Get('my-proposals')
  @UseGuards(RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  listMyProposals(@Request() req: AuthenticatedRequest) {
    return this.commissionsService.listMyProposals(req.user.id);
  }

  @Get(':id')
  getPost(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.commissionsService.getPost(id, req.user.id, req.user.roles);
  }

  @Post(':id/proposals')
  @UseGuards(RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  submitProposal(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CreateCommissionProposalDto,
  ) {
    return this.commissionsService.submitProposal(id, req.user.id, dto);
  }

  @Patch('proposals/:proposalId')
  @UseGuards(RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  updateProposal(
    @Request() req: AuthenticatedRequest,
    @Param('proposalId') proposalId: string,
    @Body() dto: UpdateCommissionProposalDto,
  ) {
    return this.commissionsService.updateProposal(proposalId, req.user.id, dto);
  }

  @Patch('proposals/:proposalId/withdraw')
  @UseGuards(RolesGuard)
  @Roles('ROLE_SELLER', 'ROLE_ADMIN')
  withdrawProposal(
    @Request() req: AuthenticatedRequest,
    @Param('proposalId') proposalId: string,
  ) {
    return this.commissionsService.withdrawProposal(proposalId, req.user.id);
  }

  @Post(':id/proposals/:proposalId/choose')
  chooseProposal(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.commissionsService.chooseProposal(id, proposalId, req.user.id);
  }

  @Patch(':id/close')
  closePost(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.commissionsService.closePost(id, req.user.id);
  }
}
