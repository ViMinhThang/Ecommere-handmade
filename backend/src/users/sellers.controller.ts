import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('sellers')
export class SellersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getSeller(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);

    // Check if the user is a seller
    if (!user.roles.includes('ROLE_SELLER')) {
      throw new NotFoundException('Seller not found');
    }

    return user;
  }
}
