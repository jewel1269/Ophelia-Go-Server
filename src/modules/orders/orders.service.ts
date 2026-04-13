import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LogSource, LogType } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateOrderDto, PaymentType } from './dto/create-order.dto';
import { deleteCache, getCache, setCache } from 'src/services/cache.service';
import { BuyNowDto } from './dto/buy-now-dto';
import { generateOrderNumber } from 'src/utility/order-number-generator/order-number-generator';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  async createOrderFromCart(userId: string, dto: CreateOrderDto) {
    const { paymentType, addressId, shippingCost } = dto;

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });

    if (!cart || cart.items.length === 0)
      throw new BadRequestException('Cart is empty');
    if (paymentType === PaymentType.COD) {
      return this.processCartCOD(userId, cart, addressId, Number(shippingCost));
    } else {
      return this.processCartOnline(
        userId,
        cart,
        addressId,
        Number(shippingCost),
      );
    }
  }

  async buyNow(userId: string, dto: BuyNowDto) {
    const {
      productId,
      variantId,
      quantity,
      paymentType,
      addressId,
      shippingCost,
    } = dto;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: variantId ? { where: { id: variantId } } : false },
    });

    if (!product) throw new NotFoundException('Product not found');
    const targetData = variantId ? product.variants[0] : product;
    const price = targetData?.price;
    if (price == null) {
      throw new BadRequestException('Invalid variant or price');
    }
    return await this.prisma.$transaction(async (tx) => {
      this.checkStock(targetData, quantity);
      const subTotal = price * quantity;
      const totalAmount = subTotal + shippingCost;
      const orderNumber = generateOrderNumber();

      const order = await this.createOrderRecord(tx, {
        userId,
        orderNumber,
        subTotal,
        shippingCost,
        totalAmount,
        addressId,
        items: [{ productId, variantId, quantity, price: targetData.price }],
      });

      await this.createPaymentRecord(tx, order.id, totalAmount, paymentType);

      await this.decrementStock(tx, productId, variantId ?? null, quantity);
      await this.clearOrderCache(userId);

      void this.activityLogs.log({
        action: 'CREATE_ORDER',
        message: `Buy-now order #${order.orderNumber} placed for ৳${totalAmount}`,
        type: LogType.INFO,
        source: LogSource.ORDER,
        userId,
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber, totalAmount, productId },
      });
      void this.notifications.notifyNewOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount,
        userId,
      });

      return { message: 'Direct order successful', order };
    });
  }

  private async processCartCOD(
    userId: string,
    cart: any,
    addressId: string,
    shippingCost: number = 0,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const { orderItems, subTotal } = this.validateCartAndCalculate(cart);
      const totalAmount = subTotal + shippingCost;
      const orderNumber = generateOrderNumber();

      const order = await this.createOrderRecord(tx, {
        userId,
        orderNumber,
        subTotal,
        shippingCost,
        totalAmount,
        addressId,
        items: orderItems,
      });

      await this.createPaymentRecord(
        tx,
        order.id,
        totalAmount,
        PaymentType.COD,
      );
      for (const item of orderItems) {
        await this.decrementStock(
          tx,
          item.productId,
          item.variantId,
          item.quantity,
        );
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await this.clearOrderCache(userId);

      // Log + notify after transaction completes
      void this.activityLogs.log({
        action: 'CREATE_ORDER',
        message: `New order #${order.orderNumber} placed for ৳${totalAmount}`,
        type: LogType.INFO,
        source: LogSource.ORDER,
        userId,
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber, totalAmount, paymentType: PaymentType.COD },
      });
      void this.notifications.notifyNewOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount,
        userId,
      });

      return order;
    });
  }

  private processCartOnline(
    userId: string,
    cart: any,
    addressId: string,
    shippingCost: number = 0,
  ) {
    const { subTotal } = this.validateCartAndCalculate(cart);
    const totalAmount = subTotal + shippingCost;
    const orderNumber = generateOrderNumber();
    return {
      message: 'Redirecting to payment gateway...',
      paymentUrl: `https://sslcommerz.com/pay/${orderNumber}`,
      orderInfo: { orderNumber, totalAmount },
    };
  }

  private validateCartAndCalculate(cart: any) {
    let subTotal = 0;
    const orderItems = cart.items.map((item: any) => {
      const target = item.variant || item.product;
      this.checkStock(target, item.quantity);
      subTotal += target.price * item.quantity;
      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: target.price,
      };
    });
    return { orderItems, subTotal };
  }

  private checkStock(target: any, quantity: number) {
    if (target.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${target.name || 'product'}`,
      );
    }
  }

  private async decrementStock(
    tx: any,
    pId: string,
    vId: string | null,
    qty: number,
  ) {
    if (vId) {
      await tx.productVariant.update({
        where: { id: vId },
        data: { stock: { decrement: qty } },
      });
    } else {
      await tx.product.update({
        where: { id: pId },
        data: { stock: { decrement: qty } },
      });
    }
  }

  private async createOrderRecord(tx: any, data: any) {
    const address = await this.prisma.address.findUnique({
      where: { id: data.addressId },
    });
    if (!address) throw new NotFoundException('Address not found');

    return await tx.order.create({
      data: {
        userId: data.userId,
        orderNumber: data.orderNumber,
        subTotal: data.subTotal,
        shippingCost: data.shippingCost,
        totalAmount: data.totalAmount,
        shippingAddress: address as any,
        status: 'PENDING',
        orderItems: {
          create: data.items.map((i) => ({
            ...i,
            orderNumber: data.orderNumber,
          })),
        },
      },
    });
  }

  private async createPaymentRecord(
    tx: any,
    orderId: string,
    amount: number,
    method: PaymentType,
  ) {
    return await tx.payment.create({
      data: {
        orderId,
        amount,
        method: method === PaymentType.COD ? 'COD' : 'ONLINE',
        transactionId: `TXN-${Date.now()}-${orderId.slice(0, 5)}`,
        status: 'PENDING',
      },
    });
  }

  private async clearOrderCache(userId: string) {
    await deleteCache('orders:all');
    await deleteCache(`orders:user:${userId}`);
  }

  async find(userId: string, status?: string) {
    const cacheKey = `orders:user:${userId}:${status || 'ALL'}`;
    const cachedOrders = await getCache(cacheKey);
    if (cachedOrders) return cachedOrders;
    const whereCondition: any = { userId };
    if (status && status !== 'ALL') {
      whereCondition.status = status;
    }
    const orders = await this.prisma.order.findMany({
      where: whereCondition,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        payment: { select: { method: true } },
        orderItems: {
          select: {
            id: true,
            price: true,
            quantity: true,
            product: { select: { name: true, thumbnail: true } },
            variant: {
              select: {
                attributes: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const result = orders || [];
    await setCache(cacheKey, result, 200);
    return result;
  }

  async findOneByOrderId(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: orderNumber },
      include: { orderItems: { include: { variant: true } } },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderNumber} not found`);
    }
    return order;
  }

  async getAllOrders(queryParams: any) {
    const { page = 1, limit = 10, search, status, paymentStatus } = queryParams;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (search) {
      where.orderNumber = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const [
      orders,
      total,
      pending,
      delivered,
      cancelled,
      processing,
      shipped,
      returned,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              phone: true,
            },
          },
          payment: {
            select: {
              method: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.order.count({ where: { ...where, status: 'PROCESSING' } }),
      this.prisma.order.count({ where: { ...where, status: 'SHIPPED' } }),
      this.prisma.order.count({ where: { ...where, status: 'RETURNED' } }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        lastPage: Math.ceil(total / Number(limit)),
      },
      stats: {
        total,
        pending,
        delivered,
        cancelled,
        processing,
        shipped,
        returned,
      },
    };
  }

  async getOrderById(id: string) {
    return await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,

        orderItems: {
          include: {
            variant: true,
            product: true,
          },
        },
      },
    });
  }

  async updateOrderStatus(id: string, dto: any) {
    const orderUpdate = await this.prisma.order.update({
      where: { id },
      data: dto,
    });
    return orderUpdate;
  }
}
