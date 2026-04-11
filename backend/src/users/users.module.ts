import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SellersController } from './sellers.controller';

@Module({
  providers: [UsersService],
  controllers: [UsersController, SellersController],
  exports: [UsersService],
})
export class UsersModule {}
