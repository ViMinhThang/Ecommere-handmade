import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';



@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Request() req: AuthenticatedRequest) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('items')
  addItem(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addItem(req.user.id, dto);
  }

  @Patch('items/:productId')
  updateItem(
    @Request() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(req.user.id, productId, dto);
  }

  @Delete('items/:productId')
  removeItem(
    @Request() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(req.user.id, productId);
  }

  @Delete()
  clearCart(@Request() req: AuthenticatedRequest) {
    return this.cartService.clearCart(req.user.id);
  }

  @Get('suggestions')
  getSuggestions(@Request() req: AuthenticatedRequest) {
    return this.cartService.getSuggestions(req.user.id);
  }
}
