import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  list(@Request() req: AuthenticatedRequest) {
    return this.wishlistService.list(req.user.id);
  }

  @Get('items/:productId')
  getProductStatus(
    @Request() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.getProductStatus(req.user.id, productId);
  }

  @Post('items/:productId')
  add(
    @Request() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.add(req.user.id, productId);
  }

  @Delete('items/:productId')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.remove(req.user.id, productId);
  }
}
