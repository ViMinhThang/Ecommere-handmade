import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { SearchSellersQueryDto } from './dto/search-sellers-query.dto';

@Controller('sellers')
export class SellersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  searchSellers(@Query() query: SearchSellersQueryDto) {
    return this.usersService.searchSellers(query);
  }

  @Get(':id')
  async getSeller(@Param('id') id: string) {
    return this.usersService.findPublicSellerById(id);
  }
}
