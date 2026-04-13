// ─────────────────────────────────────────────────────────────────────────────
// notifications.service.ts
//
// Creates AdminNotification records AND emits real-time socket events.
// Two main entry-points used by the rest of the system:
//   notifyDangerous(payload) — called by ActivityLogsService for DANGEROUS logs
//   notifyNewOrder(order)    — called by OrdersService after order creation
// ─────────────────────────────────────────────────────────────────────────────

import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminNotifType } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import {
  NotificationPayload,
  NotificationsGateway,
} from './notifications.gateway';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  // ── Dangerous alert ───────────────────────────────────────────────────────

  async notifyDangerous(opts: {
    title: string;
    message: string;
    data?: Record<string, any>;
  }) {
    const record = await this.prisma.adminNotification.create({
      data: {
        type: AdminNotifType.DANGEROUS,
        title: opts.title,
        message: opts.message,
        data: opts.data ?? {},
      },
    });

    const payload: NotificationPayload = {
      id: record.id,
      type: 'dangerous',
      title: record.title,
      message: record.message,
      data: record.data as Record<string, any>,
      timestamp: record.createdAt.toISOString(),
    };

    this.gateway.emitDangerous(payload);
    return record;
  }

  // ── New order notification ─────────────────────────────────────────────────

  async notifyNewOrder(order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    userId: string;
  }) {
    const record = await this.prisma.adminNotification.create({
      data: {
        type: AdminNotifType.ORDER,
        title: `🛒 New Order #${order.orderNumber}`,
        message: `A new order of ৳${order.totalAmount.toFixed(2)} has been placed.`,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          userId: order.userId,
        },
      },
    });

    const payload: NotificationPayload = {
      id: record.id,
      type: 'order',
      title: record.title,
      message: record.message,
      data: record.data as Record<string, any>,
      timestamp: record.createdAt.toISOString(),
    };

    this.gateway.emitOrder(payload);
    return record;
  }

  // ── Query / management ────────────────────────────────────────────────────

  async findAll(query: NotificationQueryDto) {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const skip  = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (query.type)              where.type   = query.type;
    if (query.isRead !== undefined) where.isRead = query.isRead;

    const [notifications, total] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminNotification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUnreadCount() {
    const count = await this.prisma.adminNotification.count({
      where: { isRead: false },
    });
    return { unread: count };
  }

  async markAsRead(id: string) {
    const notif = await this.prisma.adminNotification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException(`Notification "${id}" not found`);
    return this.prisma.adminNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead() {
    await this.prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async deleteOne(id: string) {
    const notif = await this.prisma.adminNotification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException(`Notification "${id}" not found`);
    return this.prisma.adminNotification.delete({ where: { id } });
  }
}
