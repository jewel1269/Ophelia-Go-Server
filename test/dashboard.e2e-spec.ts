import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie } from './helpers/auth.helper';

describe('Dashboard (e2e)', () => {
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
    // Default responses for dashboard stats
    prisma.order.count.mockResolvedValue(10);
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalAmount: 5000 },
      _count: { _all: 10 },
    });
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(20);
    prisma.product.count.mockResolvedValue(50);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.review.count.mockResolvedValue(0);
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 0 } });
    prisma.productVariant.count.mockResolvedValue(0);
    prisma.productVariant.findMany.mockResolvedValue([]);
    prisma.ticket.count.mockResolvedValue(0);
    prisma.payment.groupBy.mockResolvedValue([]);
    prisma.address.groupBy.mockResolvedValue([]);
    // Raw SQL queries return empty rows by default
    (prisma as any).$queryRaw.mockResolvedValue([]);
  });

  const adminRoutes = [
    '/api/v1/dashboard/admin/overview',
    '/api/v1/dashboard/admin/revenue?range=7d',
    '/api/v1/dashboard/admin/sales?range=7d&type=daily',
    '/api/v1/dashboard/admin/top?type=products&limit=5',
    '/api/v1/dashboard/admin/inventory?type=all',
    '/api/v1/dashboard/admin/customers?type=all',
    '/api/v1/dashboard/admin/orders?type=summary',
    '/api/v1/dashboard/admin/reviews?type=summary',
  ];

  describe('All dashboard routes require admin auth', () => {
    it.each(adminRoutes)('%s → 401 without auth', async (route) => {
      await request(app.getHttpServer()).get(route).expect(401);
    });

    it.each(adminRoutes)('%s → 403 for customer', async (route) => {
      await request(app.getHttpServer())
        .get(route)
        .set('Cookie', customerCookie())
        .expect(403);
    });
  });

  describe('GET /api/v1/dashboard/admin/overview', () => {
    it('returns 200 for admin', async () => {
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 } });

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/admin/overview')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/dashboard/admin/revenue', () => {
    it('returns 200 for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/admin/revenue?range=30d')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/dashboard/admin/top', () => {
    it('returns 200 with top products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/admin/top?type=products&limit=5')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });
});
