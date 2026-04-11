// coupon.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCouponDto) {
    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new BadRequestException('startDate cannot be greater than endDate');
    }

    const existing = await this.prisma.coupon.findUnique({
      where: { code: data.code.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    if (data.isPrivate && !data.userId) {
      throw new BadRequestException('userId is required for private coupons');
    }

    return this.prisma.coupon.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
        usedCount: 0,
      },
    });
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    isActive?: string;
    isPrivate?: string;
    search?: string;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    if (query?.isPrivate !== undefined) {
      where.isPrivate = query.isPrivate === 'true';
    }
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search.toUpperCase(), mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    console.log(coupons);

    return {
      data: coupons,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async validateCoupon(code: string, userId: string, orderAmount: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.isActive) throw new BadRequestException('Coupon is not active');
    if (new Date() < coupon.startDate)
      throw new BadRequestException('Coupon is not yet valid');
    if (new Date() > coupon.endDate)
      throw new BadRequestException('Coupon has expired');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (coupon.isPrivate && coupon.userId !== userId) {
      throw new BadRequestException('This coupon is not available for you');
    }
    if (coupon.minOrderVal && orderAmount < coupon.minOrderVal) {
      throw new BadRequestException(
        `Minimum order amount is ৳${coupon.minOrderVal}`,
      );
    }

    // Per-user usage limit check
    const userUsageCount = await this.prisma.order.count({
      where: { userId, couponId: coupon.id },
    });
    if (userUsageCount >= coupon.limitPerUser) {
      throw new BadRequestException('You have already used this coupon');
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (orderAmount * coupon.value) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.value;
    }

    return {
      coupon,
      discountAmount: Math.min(discountAmount, orderAmount),
    };
  }

  async update(id: string, data: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (data.startDate && data.endDate) {
      if (new Date(data.startDate) > new Date(data.endDate)) {
        throw new BadRequestException(
          'startDate cannot be greater than endDate',
        );
      }
    }

    if (data.code && data.code.toUpperCase() !== coupon.code) {
      const existing = await this.prisma.coupon.findUnique({
        where: { code: data.code.toUpperCase() },
      });
      if (existing) throw new BadRequestException('Coupon code already exists');
    }

    if (data.isPrivate && !data.userId && !coupon.userId) {
      throw new BadRequestException('userId is required for private coupons');
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        ...(data.code && { code: data.code.toUpperCase() }),
      },
    });
  }

  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (coupon.usedCount > 0) {
      return this.prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.coupon.delete({ where: { id } });
  }

  async getStats() {
    const now = new Date();

    const [total, active, expired, totalUsageResult] = await Promise.all([
      this.prisma.coupon.count(),
      this.prisma.coupon.count({
        where: { isActive: true, endDate: { gte: now } },
      }),
      this.prisma.coupon.count({
        where: { endDate: { lt: now } },
      }),
      this.prisma.coupon.aggregate({
        _sum: { usedCount: true },
      }),
    ]);

    return {
      total,
      active,
      expired,
      totalUsage: totalUsageResult._sum.usedCount ?? 0,
    };
  }
}
