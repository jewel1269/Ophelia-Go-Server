import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  Role,
  TicketStatus,
} from '@prisma/client';
import { DashboardRange } from './dto/dashboard-query.dto';

// Order statuses that contribute to "booked revenue". Cancelled / returned
// orders are excluded since they don't represent real revenue.
const REVENUE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts a DashboardRange enum value into a Prisma-compatible date filter.
   * Returns an empty object for ALL_TIME so it can be spread directly.
   */
  private dateBounds(range: DashboardRange = DashboardRange.LAST_30_DAYS): {
    gte?: Date;
  } {
    if (range === DashboardRange.ALL_TIME) return {};

    const now = new Date();
    const start = new Date(now);

    switch (range) {
      case DashboardRange.TODAY:
        start.setHours(0, 0, 0, 0);
        break;
      case DashboardRange.LAST_7_DAYS:
        start.setDate(start.getDate() - 7);
        break;
      case DashboardRange.LAST_30_DAYS:
        start.setDate(start.getDate() - 30);
        break;
      case DashboardRange.LAST_90_DAYS:
        start.setDate(start.getDate() - 90);
        break;
      case DashboardRange.LAST_YEAR:
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return { gte: start };
  }

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfWeek(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }

  private startOfMonth(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }

  // ---------------------------------------------------------------------------
  // 1. Overview / KPI cards
  // ---------------------------------------------------------------------------

  async overview() {
    const today = this.startOfToday();
    const week = this.startOfWeek();
    const month = this.startOfMonth();

    const activeOrder = { status: { in: REVENUE_ORDER_STATUSES } };

    const [
      revenueToday,
      revenueWeek,
      revenueMonth,
      revenueAllTime,
      totalOrders,
      totalCustomers,
      newCustomersToday,
      newCustomersWeek,
      pendingOrders,
      ordersForAov,
      outOfStockProducts,
      outOfStockVariants,
      pendingTickets,
      pendingReviews,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { ...activeOrder, createdAt: { gte: today } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...activeOrder, createdAt: { gte: week } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...activeOrder, createdAt: { gte: month } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: activeOrder,
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count(),
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
      this.prisma.user.count({
        where: { role: Role.CUSTOMER, createdAt: { gte: today } },
      }),
      this.prisma.user.count({
        where: { role: Role.CUSTOMER, createdAt: { gte: week } },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.aggregate({
        where: activeOrder,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.product.count({
        where: { stock: 0, isArchived: false },
      }),
      this.prisma.productVariant.count({ where: { stock: 0 } }),
      this.prisma.ticket.count({
        where: {
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
      }),
      this.prisma.review.count({ where: { isApproved: false } }),
    ]);

    const totalForAov = ordersForAov._sum.totalAmount ?? 0;
    const countForAov = ordersForAov._count._all;
    const averageOrderValue = countForAov > 0 ? totalForAov / countForAov : 0;

    return {
      revenue: {
        today: revenueToday._sum.totalAmount ?? 0,
        last7Days: revenueWeek._sum.totalAmount ?? 0,
        last30Days: revenueMonth._sum.totalAmount ?? 0,
        allTime: revenueAllTime._sum.totalAmount ?? 0,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        averageOrderValue,
      },
      customers: {
        total: totalCustomers,
        newToday: newCustomersToday,
        newLast7Days: newCustomersWeek,
      },
      inventory: {
        outOfStockProducts,
        outOfStockVariants,
      },
      actionRequired: {
        pendingOrders,
        pendingTickets,
        pendingReviews,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Revenue / sales charts
  // ---------------------------------------------------------------------------

  async revenueTimeSeries(range: DashboardRange) {
    const bounds = this.dateBounds(range);
    const gte = bounds.gte ?? new Date(0);

    const rows = await this.prisma.$queryRaw<
      { date: Date; revenue: number; orders: bigint }[]
    >(Prisma.sql`
      SELECT
        DATE_TRUNC('day', "createdAt") AS date,
        COALESCE(SUM("totalAmount"), 0)::float AS revenue,
        COUNT(*)::bigint AS orders
      FROM orders
      WHERE "createdAt" >= ${gte}
        AND "status"::text NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    }));
  }

  async salesByStatus(range: DashboardRange) {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: this.dateBounds(range) },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });
    return grouped.map((g) => ({
      status: g.status,
      orders: g._count._all,
      totalAmount: g._sum.totalAmount ?? 0,
    }));
  }

  async salesByPaymentMethod(range: DashboardRange) {
    const grouped = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        status: PaymentStatus.PAID,
        paidAt: this.dateBounds(range),
      },
      _count: { _all: true },
      _sum: { amount: true },
    });
    return grouped.map((g) => ({
      method: g.method,
      transactions: g._count._all,
      totalAmount: g._sum.amount ?? 0,
    }));
  }

  async salesByCategory(range: DashboardRange) {
    const bounds = this.dateBounds(range);
    const gte = bounds.gte ?? new Date(0);

    const rows = await this.prisma.$queryRaw<
      {
        categoryId: string;
        name: string;
        revenue: number;
        units: bigint;
      }[]
    >(Prisma.sql`
      SELECT
        c.id AS "categoryId",
        c.name,
        COALESCE(SUM(oi.price * oi.quantity), 0)::float AS revenue,
        COALESCE(SUM(oi.quantity), 0)::bigint AS units
      FROM order_items oi
      JOIN products p ON oi."productId" = p.id
      JOIN categories c ON p."categoryId" = c.id
      JOIN orders o ON oi."orderId" = o.id
      WHERE o."createdAt" >= ${gte}
        AND o."status"::text NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `);

    return rows.map((r) => ({
      categoryId: r.categoryId,
      name: r.name,
      revenue: Number(r.revenue),
      units: Number(r.units),
    }));
  }

  async salesByBrand(range: DashboardRange) {
    const bounds = this.dateBounds(range);
    const gte = bounds.gte ?? new Date(0);

    const rows = await this.prisma.$queryRaw<
      { brandId: string; name: string; revenue: number; units: bigint }[]
    >(Prisma.sql`
      SELECT
        b.id AS "brandId",
        b.name,
        COALESCE(SUM(oi.price * oi.quantity), 0)::float AS revenue,
        COALESCE(SUM(oi.quantity), 0)::bigint AS units
      FROM order_items oi
      JOIN products p ON oi."productId" = p.id
      JOIN brands b ON p."brandId" = b.id
      JOIN orders o ON oi."orderId" = o.id
      WHERE o."createdAt" >= ${gte}
        AND o."status"::text NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY b.id, b.name
      ORDER BY revenue DESC
    `);

    return rows.map((r) => ({
      brandId: r.brandId,
      name: r.name,
      revenue: Number(r.revenue),
      units: Number(r.units),
    }));
  }

  // ---------------------------------------------------------------------------
  // 3. Top lists
  // ---------------------------------------------------------------------------

  async topProducts(range: DashboardRange, limit: number) {
    const bounds = this.dateBounds(range);
    const gte = bounds.gte ?? new Date(0);

    const rows = await this.prisma.$queryRaw<
      {
        productId: string;
        name: string;
        sku: string;
        thumbnail: string | null;
        units: bigint;
        revenue: number;
      }[]
    >(Prisma.sql`
      SELECT
        p.id AS "productId",
        p.name,
        p.sku,
        p.thumbnail,
        COALESCE(SUM(oi.quantity), 0)::bigint AS units,
        COALESCE(SUM(oi.price * oi.quantity), 0)::float AS revenue
      FROM order_items oi
      JOIN products p ON oi."productId" = p.id
      JOIN orders o ON oi."orderId" = o.id
      WHERE o."createdAt" >= ${gte}
        AND o."status"::text NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY p.id, p.name, p.sku, p.thumbnail
      ORDER BY units DESC, revenue DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      sku: r.sku,
      thumbnail: r.thumbnail,
      units: Number(r.units),
      revenue: Number(r.revenue),
    }));
  }

  async topCustomers(range: DashboardRange, limit: number) {
    const bounds = this.dateBounds(range);
    const gte = bounds.gte ?? new Date(0);

    const rows = await this.prisma.$queryRaw<
      {
        userId: string;
        name: string | null;
        email: string;
        phone: string | null;
        orders: bigint;
        totalSpent: number;
      }[]
    >(Prisma.sql`
      SELECT
        u.id AS "userId",
        u.name,
        u.email,
        u.phone,
        COUNT(o.id)::bigint AS orders,
        COALESCE(SUM(o."totalAmount"), 0)::float AS "totalSpent"
      FROM users u
      JOIN orders o ON o."userId" = u.id
      WHERE o."createdAt" >= ${gte}
        AND o."status"::text NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY "totalSpent" DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      email: r.email,
      phone: r.phone,
      orders: Number(r.orders),
      totalSpent: Number(r.totalSpent),
    }));
  }

  async topCategories(range: DashboardRange, limit: number) {
    const full = await this.salesByCategory(range);
    return full.slice(0, limit);
  }

  async topBrands(range: DashboardRange, limit: number) {
    const full = await this.salesByBrand(range);
    return full.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // 4. Inventory health
  // ---------------------------------------------------------------------------

  async lowStockProducts(threshold: number) {
    const items = await this.prisma.product.findMany({
      where: {
        stock: { gt: 0, lte: threshold },
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        thumbnail: true,
        stock: true,
        price: true,
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
      orderBy: { stock: 'asc' },
    });
    return { threshold, count: items.length, items };
  }

  async outOfStockProducts() {
    const products = await this.prisma.product.findMany({
      where: { stock: 0, isArchived: false },
      select: {
        id: true,
        name: true,
        sku: true,
        thumbnail: true,
        price: true,
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const variants = await this.prisma.productVariant.findMany({
      where: { stock: 0 },
      select: {
        id: true,
        name: true,
        sku: true,
        product: { select: { id: true, name: true, thumbnail: true } },
      },
    });
    return {
      products: { count: products.length, items: products },
      variants: { count: variants.length, items: variants },
    };
  }

  async stockValue() {
    const rows = await this.prisma.$queryRaw<
      {
        totalValue: number;
        totalUnits: bigint;
        totalSkus: bigint;
      }[]
    >(Prisma.sql`
      SELECT
        COALESCE(SUM(stock * price), 0)::float AS "totalValue",
        COALESCE(SUM(stock), 0)::bigint AS "totalUnits",
        COUNT(*)::bigint AS "totalSkus"
      FROM products
      WHERE "isArchived" = false
    `);
    const r = rows[0];
    return {
      totalValue: Number(r?.totalValue ?? 0),
      totalUnits: Number(r?.totalUnits ?? 0),
      totalSkus: Number(r?.totalSkus ?? 0),
    };
  }

  async neverSoldProducts() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const items = await this.prisma.product.findMany({
      where: {
        orderCount: 0,
        createdAt: { lt: cutoff },
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        thumbnail: true,
        price: true,
        stock: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { count: items.length, items };
  }

  // ---------------------------------------------------------------------------
  // 5. Customer insights
  // ---------------------------------------------------------------------------

  async newCustomersTimeSeries(range: DashboardRange) {
    const bounds = this.dateBounds(range);
    const gte = bounds.gte ?? new Date(0);

    const rows = await this.prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >(Prisma.sql`
      SELECT
        DATE_TRUNC('day', "createdAt") AS date,
        COUNT(*)::bigint AS count
      FROM users
      WHERE role = 'CUSTOMER'
        AND "createdAt" >= ${gte}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  async returningVsNew(range: DashboardRange) {
    const bounds = this.dateBounds(range);
    const gte = bounds.gte ?? new Date(0);

    const rows = await this.prisma.$queryRaw<
      { bucket: string; customers: bigint; orders: bigint }[]
    >(Prisma.sql`
      WITH customer_orders AS (
        SELECT
          u.id AS user_id,
          COUNT(o.id) AS order_count
        FROM users u
        JOIN orders o ON o."userId" = u.id
        WHERE o."createdAt" >= ${gte}
          AND o."status"::text NOT IN ('CANCELLED', 'RETURNED')
        GROUP BY u.id
      )
      SELECT
        CASE WHEN order_count = 1 THEN 'new' ELSE 'returning' END AS bucket,
        COUNT(*)::bigint AS customers,
        SUM(order_count)::bigint AS orders
      FROM customer_orders
      GROUP BY 1
    `);

    const result = {
      new: { customers: 0, orders: 0 },
      returning: { customers: 0, orders: 0 },
    };
    for (const r of rows) {
      if (r.bucket === 'new') {
        result.new = {
          customers: Number(r.customers),
          orders: Number(r.orders),
        };
      } else {
        result.returning = {
          customers: Number(r.customers),
          orders: Number(r.orders),
        };
      }
    }
    return result;
  }

  async customerLocations(limit: number) {
    const grouped = await this.prisma.address.groupBy({
      by: ['city'],
      _count: { _all: true },
      orderBy: { _count: { city: 'desc' } },
      take: limit,
    });
    return grouped.map((g) => ({
      city: g.city,
      addresses: g._count._all,
    }));
  }

  // ---------------------------------------------------------------------------
  // 6. Orders operations
  // ---------------------------------------------------------------------------

  async recentOrders(limit: number) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        payment: { select: { method: true, status: true } },
        _count: { select: { orderItems: true } },
      },
    });
  }

  async pendingActionsOrders() {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const stuck = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
        createdAt: { lt: cutoff },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return { olderThanHours: 24, count: stuck.length, items: stuck };
  }

  async returnsRate(range: DashboardRange) {
    const bounds = this.dateBounds(range);
    const where = { createdAt: bounds };
    const [delivered, cancelled, returned, total] = await Promise.all([
      this.prisma.order.count({
        where: { ...where, status: OrderStatus.DELIVERED },
      }),
      this.prisma.order.count({
        where: { ...where, status: OrderStatus.CANCELLED },
      }),
      this.prisma.order.count({
        where: { ...where, status: OrderStatus.RETURNED },
      }),
      this.prisma.order.count({ where }),
    ]);
    const denom = delivered + cancelled + returned;
    return {
      delivered,
      cancelled,
      returned,
      totalOrders: total,
      cancellationRate: denom > 0 ? cancelled / denom : 0,
      returnRate: denom > 0 ? returned / denom : 0,
    };
  }

  async fulfillmentTime(range: DashboardRange) {
    const bounds = this.dateBounds(range);
    const gte = bounds.gte ?? new Date(0);

    const rows = await this.prisma.$queryRaw<
      { avgHours: number | null; sampleSize: bigint }[]
    >(Prisma.sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600)::float AS "avgHours",
        COUNT(*)::bigint AS "sampleSize"
      FROM orders
      WHERE "createdAt" >= ${gte}
        AND "status"::text IN ('SHIPPED', 'DELIVERED')
    `);
    const r = rows[0];
    return {
      avgHoursCreatedToShipped: r?.avgHours ? Number(r.avgHours) : null,
      sampleSize: Number(r?.sampleSize ?? 0),
      note: 'Approximated using updatedAt - createdAt on SHIPPED/DELIVERED orders.',
    };
  }

  // ---------------------------------------------------------------------------
  // 7. Marketing / promotions
  // ---------------------------------------------------------------------------

  async couponUsage() {
    const coupons = await this.prisma.coupon.findMany({
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        usageLimit: true,
        usedCount: true,
        isActive: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { usedCount: 'desc' },
    });

    const discountRows = await this.prisma.order.groupBy({
      by: ['couponId'],
      where: { couponId: { not: null } },
      _sum: { discountAmount: true },
      _count: { _all: true },
    });
    const discountByCoupon = new Map(
      discountRows.map((d) => [
        d.couponId!,
        {
          orders: d._count._all,
          totalDiscount: d._sum.discountAmount ?? 0,
        },
      ]),
    );

    return coupons.map((c) => {
      const stats = discountByCoupon.get(c.id) ?? {
        orders: 0,
        totalDiscount: 0,
      };
      return {
        ...c,
        orders: stats.orders,
        totalDiscountGiven: stats.totalDiscount,
        remaining: c.usageLimit != null ? c.usageLimit - c.usedCount : null,
      };
    });
  }

  async flashSalePerformance() {
    const sales = await this.prisma.flashSale.findMany({
      include: {
        products: {
          select: {
            productId: true,
            discountPrice: true,
            stock: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const result = await Promise.all(
      sales.map(async (s) => {
        if (s.products.length === 0) {
          return {
            id: s.id,
            name: s.name,
            slug: s.slug,
            startDate: s.startDate,
            endDate: s.endDate,
            isActive: s.isActive,
            productCount: 0,
            unitsSold: 0,
            revenue: 0,
          };
        }
        const productIds = s.products.map((p) => p.productId);
        const agg = await this.prisma.orderItem.aggregate({
          where: {
            productId: { in: productIds },
            order: {
              createdAt: { gte: s.startDate, lte: s.endDate },
              status: { notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
            },
          },
          _sum: { quantity: true },
        });
        const revRows = await this.prisma.$queryRaw<{ revenue: number }[]>(
          Prisma.sql`
            SELECT COALESCE(SUM(oi.price * oi.quantity), 0)::float AS revenue
            FROM order_items oi
            JOIN orders o ON oi."orderId" = o.id
            WHERE oi."productId" = ANY(${productIds}::text[])
              AND o."createdAt" >= ${s.startDate}
              AND o."createdAt" <= ${s.endDate}
              AND o."status"::text NOT IN ('CANCELLED', 'RETURNED')
          `,
        );
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          startDate: s.startDate,
          endDate: s.endDate,
          isActive: s.isActive,
          productCount: s.products.length,
          unitsSold: agg._sum.quantity ?? 0,
          revenue: Number(revRows[0]?.revenue ?? 0),
        };
      }),
    );

    return result;
  }

  async activeBanners() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Reviews / quality
  // ---------------------------------------------------------------------------

  async pendingReviews(limit: number) {
    const items = await this.prisma.review.findMany({
      where: { isApproved: false, isArchived: false },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, thumbnail: true } },
      },
    });
    const total = await this.prisma.review.count({
      where: { isApproved: false, isArchived: false },
    });
    return { count: total, items };
  }

  async reviewsSummary() {
    const [total, pending, avg, distribution] = await Promise.all([
      this.prisma.review.count({ where: { isArchived: false } }),
      this.prisma.review.count({
        where: { isApproved: false, isArchived: false },
      }),
      this.prisma.review.aggregate({
        where: { isArchived: false },
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { isArchived: false },
        _count: { _all: true },
        orderBy: { rating: 'asc' },
      }),
    ]);

    return {
      total,
      pendingApproval: pending,
      averageRating: avg._avg.rating ?? 0,
      distribution: distribution.map((d) => ({
        rating: d.rating,
        count: d._count._all,
      })),
    };
  }

  async lowRatedProducts(minReviewCount = 3) {
    const rows = await this.prisma.product.findMany({
      where: {
        averageRating: { lt: 3, gt: 0 },
        rating: { gte: minReviewCount },
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        thumbnail: true,
        averageRating: true,
        rating: true,
      },
      orderBy: { averageRating: 'asc' },
    });
    return { threshold: 3, minReviewCount, count: rows.length, items: rows };
  }

  // ---------------------------------------------------------------------------
  // 9. Support / tickets
  // ---------------------------------------------------------------------------

  async ticketsSummary() {
    const [byStatus, byPriority, total] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where: {
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
        _count: { _all: true },
      }),
      this.prisma.ticket.count(),
    ]);

    return {
      total,
      byStatus: byStatus.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
      openByPriority: byPriority.map((g) => ({
        priority: g.priority,
        count: g._count._all,
      })),
    };
  }

  async openTicketsByPriority() {
    const items = await this.prisma.ticket.findMany({
      where: {
        status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
    });
    return { count: items.length, items };
  }

  async ticketResponseTime() {
    // Average time between the first customer message in a ticket and the
    // first admin reply after it. If there's no admin reply yet, the ticket
    // is excluded from the average (it's still "waiting").
    const rows = await this.prisma.$queryRaw<
      { avgMinutes: number | null; sampleSize: bigint }[]
    >(Prisma.sql`
      WITH first_customer AS (
        SELECT "ticketId", MIN("createdAt") AS first_at
        FROM ticket_messages
        WHERE "isAdmin" = false
        GROUP BY "ticketId"
      ),
      first_admin AS (
        SELECT tm."ticketId", MIN(tm."createdAt") AS first_at
        FROM ticket_messages tm
        JOIN first_customer fc ON fc."ticketId" = tm."ticketId"
        WHERE tm."isAdmin" = true
          AND tm."createdAt" >= fc.first_at
        GROUP BY tm."ticketId"
      )
      SELECT
        AVG(EXTRACT(EPOCH FROM (fa.first_at - fc.first_at)) / 60)::float AS "avgMinutes",
        COUNT(*)::bigint AS "sampleSize"
      FROM first_customer fc
      JOIN first_admin fa ON fa."ticketId" = fc."ticketId"
    `);
    const r = rows[0];
    return {
      avgMinutes: r?.avgMinutes ? Number(r.avgMinutes) : null,
      sampleSize: Number(r?.sampleSize ?? 0),
    };
  }

  // ---------------------------------------------------------------------------
  // 10. Activity feed
  // ---------------------------------------------------------------------------

  async activityFeed(limit: number) {
    return this.prisma.activityLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
