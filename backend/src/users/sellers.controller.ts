import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SearchSellersQueryDto } from './dto/search-sellers-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

@Controller('sellers')
export class SellersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('following/me')
  @UseGuards(JwtAuthGuard)
  listFollowedShops(@Request() req: AuthenticatedRequest) {
    return this.usersService.listFollowedShops(req.user.id, req.user.roles);
  }

  @Get('search')
  searchSellers(@Query() query: SearchSellersQueryDto) {
    return this.usersService.searchSellers(query);
  }

  @Get(':id/follow-status')
  @UseGuards(JwtAuthGuard)
  getFollowStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.usersService.getShopFollowStatus(
      req.user.id,
      req.user.roles,
      id,
    );
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  followShop(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.usersService.followShop(req.user.id, req.user.roles, id);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  unfollowShop(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.usersService.unfollowShop(req.user.id, req.user.roles, id);
  }

  @Get(':id')
  async getSeller(@Param('id') id: string) {
    return this.usersService.findPublicSellerById(id);
  }
}
