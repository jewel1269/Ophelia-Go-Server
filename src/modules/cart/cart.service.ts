import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateCartWithItemsDto } from './dto/create-cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addToCart(dto: CreateCartWithItemsDto) {
    console.log(dto);
    const cart = await this.prisma.cart.upsert({
      where: { userId: dto.userId },
      update: {},
      create: { userId: dto.userId },
    });
    const cartItemPromises = dto.items.map((item) => {
      const variantId = item.variantId || null;
      if (!variantId) {
        return this.prisma.cartItem
          .findFirst({
            where: {
              cartId: cart.id,
              productId: item.productId,
              variantId: null,
            },
          })
          .then((existing) => {
            if (existing) {
              return this.prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: { increment: item.quantity } },
              });
            }
            return this.prisma.cartItem.create({
              data: {
                cartId: cart.id,
                productId: item.productId,
                variantId: null,
                quantity: item.quantity,
              },
            });
          });
      }
      return this.prisma.cartItem.upsert({
        where: {
          cartId_productId_variantId: {
            cartId: cart.id,
            productId: item.productId,
            variantId,
          },
        },
        update: { quantity: { increment: item.quantity } },
        create: {
          cartId: cart.id,
          productId: item.productId,
          variantId,
          quantity: item.quantity,
        },
      });
    });

    await Promise.all(cartItemPromises);
    return this.getCart(dto.userId!);
  }

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException(`Cart for user ${userId} not found`);
    }

    return cart;
  }

  async removeFromCart(
    userId: string,
    productId: string,
    variantId: string | null,
  ) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });
    if (!cartItem) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: cartItem.id } });
    return this.getCart(userId);
  }

  async updateCartItem(
    userId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
  ) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });
    if (!cartItem) throw new NotFoundException('Cart item not found');
    const updated = await this.prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    });
    return this.getCart(userId);
  }
}
