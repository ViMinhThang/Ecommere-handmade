import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req: AuthenticatedRequest) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('profile')
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Post()
  @Roles('ROLE_ADMIN')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create({
      ...createUserDto,
      isEmailVerified: true,
    });
  }

  @Get()
  @Roles('ROLE_ADMIN')
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query.role, query.status, query);
  }

  @Get('stats')
  @Roles('ROLE_ADMIN')
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id/addresses')
  getAddresses(@Param('id') id: string) {
    return this.usersService.getAddresses(id);
  }

  @Post(':id/addresses')
  addAddress(
    @Param('id') id: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.usersService.addAddress(id, createAddressDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ROLE_ADMIN')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('ROLE_ADMIN')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':userId/addresses/:addressId')
  updateAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: Partial<CreateAddressDto>,
  ) {
    return this.usersService.updateAddress(userId, addressId, updateAddressDto);
  }

  @Delete(':userId/addresses/:addressId')
  deleteAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.deleteAddress(userId, addressId);
  }
}
