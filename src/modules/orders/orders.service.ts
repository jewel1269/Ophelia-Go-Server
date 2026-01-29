import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/common/database/prisma.service';
import { generateOrderNumber } from 'src/utility/order-number-generator/order-number-generator';
import { deleteCache, getCache, setCache } from 'src/services/cache.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const orderNumber = generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId: createOrderDto.userId,
        status: createOrderDto.status ?? 'PENDING',
        subTotal: createOrderDto.subTotal,
        shippingCost: createOrderDto.shippingCost,
        discountAmount: createOrderDto.discountAmount ?? 0,
        totalAmount: createOrderDto.totalAmount,
        shippingAddress: createOrderDto.shippingAddress,
        billingAddress: createOrderDto.billingAddress,
        couponId: createOrderDto.couponId,
        payment: {
          create: {
            method: createOrderDto.payment.method,
            status: createOrderDto.payment.status,
            amount: createOrderDto.payment.amount,
            transactionId: createOrderDto.payment.transactionId,
            cardType: createOrderDto.payment.cardType,
            currency: createOrderDto.payment.currency,
          },
        },
        orderItems: {
          create: createOrderDto.orderItems.map((item) => ({
            orderNumber,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { orderItems: true, payment: true, user: true },
    });

    await deleteCache('orders:all');
    await deleteCache(`orders:user:${createOrderDto.userId}`);

    return order;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    paymentStatus?: string;
  }) {
    const { page = 1, limit = 10, search, status, paymentStatus } = query;
    const cacheKey = `orders:all:p${page}:l${limit}:s${search || 'none'}:st${status || 'all'}:ps${paymentStatus || 'all'}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) return cachedData;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status && status !== 'All Status') where.status = status;
    if (paymentStatus && paymentStatus !== 'Payment: All') {
      where.payment = { status: paymentStatus.toUpperCase() };
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          user: { select: { name: true, phone: true } },
          payment: { select: { method: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    const result = {
      data: orders,
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / limit),
      },
    };
    await setCache(cacheKey, result, 100);
    return result;
  }

  async findOne(id: string) {
    const cacheKey = `order:${id}`;
    const cachedOrder = await getCache(cacheKey);
    if (cachedOrder) return cachedOrder;

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: { select: { id: true, name: true, thumbnail: true } },
            variant: { select: { id: true, name: true } },
          },
        },
        user: { select: { name: true, phone: true, email: true } },
        payment: true,
        coupon: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    await setCache(cacheKey, order, 600);
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = true;

    await deleteCache(`order:${id}`);
    await deleteCache('orders:all');
    // await deleteCache(`orders:user:${order.userId}`);

    return order;
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.order.delete({ where: { id } });

    await deleteCache(`order:${id}`);
    await deleteCache('orders:all');
    await deleteCache(`orders:user:${order.userId}`);

    return { message: 'Order deleted successfully' };
  }
}
