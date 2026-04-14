import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { EmailService } from 'src/services/email.service';
import {
  AUDIENCE_KEYS,
  AUDIENCE_LABELS,
  AudienceKey,
  SendBulkCampaignDto,
  SendSingleEmailDto,
} from './dto/send-campaign.dto';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 150;

@Injectable()
export class EmailCampaignService {
  private readonly logger = new Logger(EmailCampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ── Audience helpers ────────────────────────────────────────────────────────

  private async getAudienceEmails(audience: AudienceKey): Promise<string[]> {
    const now = new Date();

    if (audience === 'ALL_CUSTOMERS') {
      const users = await this.prisma.user.findMany({
        where: { role: Role.CUSTOMER },
        select: { email: true },
      });
      return users.map((u) => u.email);
    }

    if (audience === 'VIP_CUSTOMERS') {
      const orderCounts = await this.prisma.order.groupBy({
        by: ['userId'],
        _count: { id: true },
        having: { id: { _count: { gte: 3 } } },
      });
      const vipUserIds = orderCounts.map((o) => o.userId);
      if (!vipUserIds.length) return [];

      const users = await this.prisma.user.findMany({
        where: { id: { in: vipUserIds }, role: Role.CUSTOMER },
        select: { email: true },
      });
      return users.map((u) => u.email);
    }

    if (audience === 'INACTIVE_30_DAYS') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentOrders = await this.prisma.order.findMany({
        where: { createdAt: { gte: cutoff } },
        select: { userId: true },
        distinct: ['userId'],
      });
      const activeIds = recentOrders.map((o) => o.userId);

      const users = await this.prisma.user.findMany({
        where: {
          role: Role.CUSTOMER,
          ...(activeIds.length > 0 ? { id: { notIn: activeIds } } : {}),
        },
        select: { email: true },
      });
      return users.map((u) => u.email);
    }

    if (audience === 'NEW_CUSTOMERS') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const users = await this.prisma.user.findMany({
        where: { role: Role.CUSTOMER, createdAt: { gte: cutoff } },
        select: { email: true },
      });
      return users.map((u) => u.email);
    }

    return [];
  }

  async getAudienceCounts(): Promise<Record<AudienceKey, number>> {
    const entries = await Promise.all(
      AUDIENCE_KEYS.map(async (key) => {
        try {
          const emails = await this.getAudienceEmails(key);
          return [key, emails.length] as [AudienceKey, number];
        } catch (err) {
          this.logger.error(
            `getAudienceCounts[${key}] failed: ${err?.message}`,
            err?.stack,
          );
          return [key, 0] as [AudienceKey, number];
        }
      }),
    );
    return Object.fromEntries(entries) as Record<AudienceKey, number>;
  }

  // ── Batch send helper ────────────────────────────────────────────────────────

  private async sendInBatches(
    emails: string[],
    subject: string,
    content: string,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (email) => {
          try {
            await this.emailService.sendCampaignEmail(email, subject, content);
            sent++;
          } catch (err) {
            this.logger.warn(`Failed to send to ${email}: ${err?.message}`);
            failed++;
          }
        }),
      );
      if (i + BATCH_SIZE < emails.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    return { sent, failed };
  }

  // ── Send single email ────────────────────────────────────────────────────────

  async sendSingle(dto: SendSingleEmailDto) {
    let sent = 0;
    let failed = 0;

    try {
      await this.emailService.sendCampaignEmail(dto.to, dto.subject, dto.content);
      sent = 1;
    } catch {
      failed = 1;
    }

    const status = failed === 0 ? 'SENT' : 'FAILED';

    await this.prisma.emailCampaign.create({
      data: {
        type: 'SINGLE',
        subject: dto.subject,
        content: dto.content,
        audience: dto.to,
        audienceLabel: dto.to,
        sentCount: sent,
        failedCount: failed,
        status,
      },
    });

    if (failed > 0) {
      throw new Error(`Failed to deliver email to ${dto.to}`);
    }

    return { message: 'Email sent successfully', sent, failed };
  }

  // ── Send bulk campaign ────────────────────────────────────────────────────────

  async sendBulk(dto: SendBulkCampaignDto) {
    const emails = await this.getAudienceEmails(dto.audience);

    if (emails.length === 0) {
      return { message: 'No recipients found for this audience', sent: 0, failed: 0 };
    }

    const { sent, failed } = await this.sendInBatches(emails, dto.subject, dto.content);

    const status = failed === 0 ? 'SENT' : sent === 0 ? 'FAILED' : 'PARTIAL';

    await this.prisma.emailCampaign.create({
      data: {
        type: 'BULK',
        subject: dto.subject,
        content: dto.content,
        audience: dto.audience,
        audienceLabel: AUDIENCE_LABELS[dto.audience],
        sentCount: sent,
        failedCount: failed,
        status,
      },
    });

    return {
      message: `Campaign sent to ${sent} recipients${failed > 0 ? `, ${failed} failed` : ''}`,
      sent,
      failed,
      total: emails.length,
    };
  }

  // ── Campaign logs ────────────────────────────────────────────────────────────

  async getLogs(limit = 20) {
    return this.prisma.emailCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        subject: true,
        audienceLabel: true,
        sentCount: true,
        failedCount: true,
        status: true,
        sentAt: true,
        createdAt: true,
      },
    });
  }

  async getStats() {
    const [total, sentAgg, failedAgg] = await Promise.all([
      this.prisma.emailCampaign.count(),
      this.prisma.emailCampaign.aggregate({ _sum: { sentCount: true } }),
      this.prisma.emailCampaign.aggregate({ _sum: { failedCount: true } }),
    ]);

    const totalSent = sentAgg._sum.sentCount ?? 0;
    const totalFailed = failedAgg._sum.failedCount ?? 0;
    const grandTotal = totalSent + totalFailed;
    const deliveryRate =
      grandTotal > 0 ? Math.round((totalSent / grandTotal) * 1000) / 10 : 0;

    return {
      totalCampaigns: total,
      totalEmailsSent: totalSent,
      totalFailed,
      deliveryRate,
    };
  }
}
