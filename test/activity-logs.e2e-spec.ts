import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie } from './helpers/auth.helper';

const mockLog = {
  id: 'log-id',
  userId: 'uid',
  action: 'LOGIN',
  details: {},
  ipAddress: '127.0.0.1',
  userAgent: 'jest',
  isDangerous: false,
  createdAt: new Date().toISOString(),
};

describe('Activity Logs (e2e)', () => {
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

  describe('GET /api/v1/activity-logs', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/activity-logs')
        .expect(401);
    });

    it('returns 403 for customer', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/activity-logs')
        .set('Cookie', customerCookie())
        .expect(403);
    });

    it('returns 200 for admin', async () => {
      prisma.activityLog.findMany.mockResolvedValue([mockLog]);
      prisma.activityLog.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/activity-logs')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/activity-logs/stats', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/activity-logs/stats')
        .expect(401);
    });

    it('returns 200 for admin', async () => {
      prisma.activityLog.count.mockResolvedValue(100);
      prisma.activityLog.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/activity-logs/stats')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/activity-logs/dangerous', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/activity-logs/dangerous')
        .expect(401);
    });

    it('returns 200 for admin', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/activity-logs/dangerous')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });
});
