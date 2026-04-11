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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('/add')
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add items to cart [CUSTOMER]',
    description:
      'Authenticated customers only. Adds one or more items to the logged-in user cart.',
  })
  @ApiBody({ type: CreateCartWithItemsDto })
  @ApiResponse({ status: 201, description: 'Items added to cart' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sync / get cart [CUSTOMER]',
    description:
      'Authenticated customers only. Returns the current cart of the logged-in user.',
  })
  @ApiResponse({ status: 200, description: 'Cart data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: any) {
    const userId = user.sub;
    const cart = this.cartService.getCart(userId);
    return cart;
  }

  @Delete('/remove/:productId')
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove an item from cart [CUSTOMER]',
    description:
      'Authenticated customers only. Removes a product (and optional variant) from the logged-in user cart.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID to remove',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @ApiQuery({
    name: 'variantId',
    required: false,
    description: 'Optional variant UUID',
    example: 'c5d2e3f4-5678-9abc-def0-123456789abc',
  })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update cart item quantity [CUSTOMER]',
    description:
      'Authenticated customers only. Updates the quantity of a product (and optional variant) in the logged-in user cart.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['productId', 'quantity'],
      properties: {
        productId: {
          type: 'string',
          example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
        },
        variantId: {
          type: 'string',
          nullable: true,
          example: 'c5d2e3f4-5678-9abc-def0-123456789abc',
        },
        quantity: { type: 'integer', example: 3 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
