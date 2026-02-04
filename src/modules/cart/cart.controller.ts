import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('/add')
  @UseGuards(JwtRefreshGuard)
  create(@Body() createCartDto: CreateCartDto, @CurrentUser() user: any) {
    const userId = user.sub;
    const cartItem = this.cartService.addToCart({ ...createCartDto, userId });
    return cartItem;
  }

  @Get('/sync')
  @UseGuards(JwtRefreshGuard)
  findAll(@CurrentUser() user: any) {
    const userId = user.sub;
    const cart = this.cartService.getCart(userId);
    return cart;
  }
}
