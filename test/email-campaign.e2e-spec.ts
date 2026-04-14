import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie } from './helpers/auth.helper';

describe('Email Campaign (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /email-campaign/audience-counts ────────────────────────────────────

  describe('GET /api/v1/email-campaign/audience-counts', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/email-campaign/audience-counts')
        .expect(401);
    });

    it('returns 403 for customer', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/email-campaign/audience-counts')
        .set('Cookie', customerCookie())
        .expect(403);
    });

    it('returns 200 with counts for admin', async () => {
      prisma.user.findMany.mockResolvedValue([
        { email: 'a@test.com' },
        { email: 'b@test.com' },
      ]);
      prisma.order.groupBy.mockResolvedValue([]);
      prisma.order.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/email-campaign/audience-counts')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('ALL_CUSTOMERS');
      expect(res.body.data).toHaveProperty('VIP_CUSTOMERS');
      expect(res.body.data).toHaveProperty('INACTIVE_30_DAYS');
      expect(res.body.data).toHaveProperty('NEW_CUSTOMERS');
    });
  });

  // ── GET /email-campaign/stats ───────────────────────────────────────────────

  describe('GET /api/v1/email-campaign/stats', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/email-campaign/stats')
        .expect(401);
    });

    it('returns 200 with stats for admin', async () => {
      prisma.emailCampaign.count.mockResolvedValue(5);
      prisma.emailCampaign.aggregate
        .mockResolvedValueOnce({ _sum: { sentCount: 200 } })
        .mockResolvedValueOnce({ _sum: { failedCount: 10 } });

      const res = await request(app.getHttpServer())
        .get('/api/v1/email-campaign/stats')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        totalCampaigns: 5,
        totalEmailsSent: 200,
        totalFailed: 10,
      });
    });
  });

  // ── GET /email-campaign/logs ────────────────────────────────────────────────

  describe('GET /api/v1/email-campaign/logs', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/email-campaign/logs')
        .expect(401);
    });

    it('returns 200 with logs for admin', async () => {
      prisma.emailCampaign.findMany.mockResolvedValue([
        {
          id: 'log-1',
          type: 'BULK',
          subject: 'Summer Sale',
          audienceLabel: 'All Registered Customers',
          sentCount: 50,
          failedCount: 0,
          status: 'SENT',
          createdAt: new Date().toISOString(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/email-campaign/logs')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── POST /email-campaign/send-single ───────────────────────────────────────

  describe('POST /api/v1/email-campaign/send-single', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email-campaign/send-single')
        .send({ to: 'user@test.com', subject: 'Hello', content: '<p>Test</p>' })
        .expect(401);
    });

    it('returns 400 when to field is not an email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email-campaign/send-single')
        .set('Cookie', adminCookie())
        .send({ to: 'not-an-email', subject: 'Hello', content: '<p>Test</p>' })
        .expect(400);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email-campaign/send-single')
        .set('Cookie', adminCookie())
        .send({ to: 'user@test.com' })
        .expect(400);
    });

    it('returns 201 on successful send', async () => {
      prisma.emailCampaign.create.mockResolvedValue({ id: 'campaign-id' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/email-campaign/send-single')
        .set('Cookie', adminCookie())
        .send({
          to: 'user@test.com',
          subject: 'Hello from Ophelia Go',
          content: '<p>Welcome!</p>',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('sent', 1);
    });
  });

  // ── POST /email-campaign/send-bulk ──────────────────────────────────────────

  describe('POST /api/v1/email-campaign/send-bulk', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email-campaign/send-bulk')
        .send({ audience: 'ALL_CUSTOMERS', subject: 'Hello', content: '<p>Hi</p>' })
        .expect(401);
    });

    it('returns 400 when audience is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/email-campaign/send-bulk')
        .set('Cookie', adminCookie())
        .send({ audience: 'INVALID_AUDIENCE', subject: 'Hello', content: '<p>Hi</p>' })
        .expect(400);
    });

    it('returns 201 when sent to ALL_CUSTOMERS', async () => {
      prisma.user.findMany.mockResolvedValue([
        { email: 'c1@test.com' },
        { email: 'c2@test.com' },
      ]);
      prisma.emailCampaign.create.mockResolvedValue({ id: 'campaign-id' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/email-campaign/send-bulk')
        .set('Cookie', adminCookie())
        .send({
          audience: 'ALL_CUSTOMERS',
          subject: 'Big Summer Sale',
          content: '<p>Up to 50% off!</p>',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('total', 2);
    });
  });
});
