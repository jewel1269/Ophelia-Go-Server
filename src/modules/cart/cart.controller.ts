import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
  Query,
  Put,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateCartWithItemsDto } from './dto/create-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('/add')
  @UseGuards(JwtRefreshGuard)
  create(
    @Body() createCartDto: CreateCartWithItemsDto,
    @CurrentUser() user: any,
  ) {
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

  @Delete('/remove/:productId')
  @UseGuards(JwtRefreshGuard)
  async removeFromCart(
    @Param('productId') productId: string,
    @Query('variantId') variantId: string | null,
    @CurrentUser() user: any,
  ) {
    return this.cartService.removeFromCart(
      user.sub,
      productId,
      variantId ?? null,
    );
  }

  @Put('/update')
  @UseGuards(JwtRefreshGuard)
  async updateCartItem(
    @Body()
    dto: { productId: string; variantId: string | null; quantity: number },
    @CurrentUser() user: any,
  ) {
    return this.cartService.updateCartItem(
      user.sub,
      dto.productId,
      dto.variantId ?? null,
      dto.quantity,
    );
  }
}
