import {
  Controller,
  ForbiddenException,
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
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private assertCanAccessUser(request: AuthenticatedRequest, userId: string) {
    if (
      request.user.id === userId ||
      request.user.roles.includes('ROLE_ADMIN')
    ) {
      return;
    }

    throw new ForbiddenException('You can only manage your own addresses');
  }

  @Get('me')
  getMe(@Request() req: AuthenticatedRequest) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('profile')
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @Patch('account/password')
  changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.id, changePasswordDto);
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
  getAddresses(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    this.assertCanAccessUser(req, id);
    return this.usersService.getAddresses(id);
  }

  @Post(':id/addresses')
  addAddress(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    this.assertCanAccessUser(req, id);
    return this.usersService.addAddress(id, createAddressDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ROLE_ADMIN')
  update(@Param('id') id: string, @Body() updateUserDto: AdminUpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('ROLE_ADMIN')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':userId/addresses/:addressId')
  updateAddress(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: Partial<CreateAddressDto>,
  ) {
    this.assertCanAccessUser(req, userId);
    return this.usersService.updateAddress(userId, addressId, updateAddressDto);
  }

  @Delete(':userId/addresses/:addressId')
  deleteAddress(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
  ) {
    this.assertCanAccessUser(req, userId);
    return this.usersService.deleteAddress(userId, addressId);
  }
}
