import { Injectable } from '@nestjs/common';
import { CreateCartDto } from './dto/create-cart.dto';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addToCart(CreateCartDto: CreateCartDto) {
    const cart = await this.prisma.cart.upsert({
      where: { userId: CreateCartDto.userId },
      update: {},
      create: { userId: CreateCartDto.userId },
    });

    const cartItem = await this.prisma.cartItem.upsert({
      where: {
        cartId_productId_variantId: {
          cartId: cart.id,
          productId: CreateCartDto.productId,
          variantId: CreateCartDto.variantId,
        },
      },
      update: {
        quantity: { increment: CreateCartDto.quantity },
      },
      create: {
        cartId: cart.id,
        productId: CreateCartDto.productId,
        variantId: CreateCartDto.variantId,
        quantity: CreateCartDto.quantity,
      },
    });

    return cartItem;
  }

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: userId },
      include: {
        items: { include: { product: true, variant: true } },
      },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    return cart;
  }
}
