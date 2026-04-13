// ─────────────────────────────────────────────────────────────────────────────
// activity-logs.service.ts
//
// Global reusable logging service.
// Usage anywhere in the codebase:
//   void this.activityLogs.log({ action: 'USER_LOGIN', message: '...', userId, type: LogType.INFO })
//
// If type === DANGEROUS the service automatically triggers a real-time alert
// via NotificationsService (forwardRef to break the circular dep).
// ─────────────────────────────────────────────────────────────────────────────

import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { LogSource, LogType } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateLogDto } from './dto/create-log.dto';
import { LogQueryDto } from './dto/log-query.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService | null,
  ) {}

  // ── Core log writer ───────────────────────────────────────────────────────

  /**
   * Fire-and-forget logging — use `void this.activityLogs.log(...)`.
   */
  async log(dto: CreateLogDto): Promise<void> {
    try {
      const entry = await this.prisma.activityLog.create({
        data: {
          action:   dto.action,
          message:  dto.message,
          type:     dto.type    ?? LogType.INFO,
          source:   dto.source  ?? LogSource.API,
          userId:   dto.userId  ?? null,
          entityId: dto.entityId ?? null,
          metadata: dto.metadata ?? {},
        },
      });

      // Auto-escalate dangerous logs → real-time alert
      if (entry.type === LogType.DANGEROUS && this.notificationsService) {
        void this.notificationsService.notifyDangerous({
          title:   `⚠️ ${dto.action.replace(/_/g, ' ')}`,
          message: dto.message,
          data: {
            logId:    entry.id,
            action:   entry.action,
            source:   entry.source,
            userId:   entry.userId,
            entityId: entry.entityId,
            metadata: entry.metadata,
          },
        });
      }
    } catch (err) {
      // Never crash the caller
      this.logger.error('Failed to write activity log', err);
    }
  }

  // ── Query helpers ─────────────────────────────────────────────────────────

  async findAll(query: LogQueryDto) {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const skip  = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (query.type)   where.type   = query.type;
    if (query.source) where.source = query.source;
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { message: { contains: query.search, mode: 'insensitive' } },
        { action:  { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    return this.prisma.activityLog.findUnique({ where: { id } });
  }

  async getStats() {
    const [total, dangerous, warnings, infos, bySource] = await Promise.all([
      this.prisma.activityLog.count(),
      this.prisma.activityLog.count({ where: { type: LogType.DANGEROUS } }),
      this.prisma.activityLog.count({ where: { type: LogType.WARNING } }),
      this.prisma.activityLog.count({ where: { type: LogType.INFO } }),
      this.prisma.activityLog.groupBy({
        by: ['source'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      total,
      dangerous,
      warnings,
      infos,
      bySource: bySource.map((s) => ({ source: s.source, count: s._count.id })),
    };
  }

  async getDangerousLogs(limit = 10) {
    return this.prisma.activityLog.findMany({
      where: { type: LogType.DANGEROUS },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
