import {
  Body,
  Controller,
  Delete,
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
import { CustomOrderQuoteTemplatesService } from './custom-order-quote-templates.service';
import { CreateCustomOrderQuoteTemplateDto } from './dto/create-custom-order-quote-template.dto';
import { UpdateCustomOrderQuoteTemplateDto } from './dto/update-custom-order-quote-template.dto';

@Controller('custom-order-quote-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomOrderQuoteTemplatesController {
  constructor(
    private readonly quoteTemplatesService: CustomOrderQuoteTemplatesService,
  ) {}

  @Get()
  @Roles('ROLE_SELLER')
  findAll(@Request() req: AuthenticatedRequest) {
    return this.quoteTemplatesService.findAll(req.user.id);
  }

  @Post()
  @Roles('ROLE_SELLER')
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCustomOrderQuoteTemplateDto,
  ) {
    return this.quoteTemplatesService.create(req.user.id, dto);
  }

  @Get(':id')
  @Roles('ROLE_SELLER')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.quoteTemplatesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @Roles('ROLE_SELLER')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomOrderQuoteTemplateDto,
  ) {
    return this.quoteTemplatesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @Roles('ROLE_SELLER')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.quoteTemplatesService.remove(id, req.user.id);
  }
}
