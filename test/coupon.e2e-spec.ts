import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie } from './helpers/auth.helper';

const mockCoupon = {
  id: 'coupon-id',
  code: 'SAVE20',
  type: 'PERCENTAGE',
  value: 20,
  minOrderValue: 100,
  maxUsage: 100,
  usedCount: 0,
  isActive: true,
  expiresAt: new Date(Date.now() + 86400_000).toISOString(),
  createdAt: new Date().toISOString(),
};

describe('Coupons (e2e)', () => {
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

  // ── GET /coupon/public/active ───────────────────────────────────────────────

  describe('GET /api/v1/coupon/public/active', () => {
    it('returns 200 (public)', async () => {
      prisma.coupon.findMany.mockResolvedValue([mockCoupon]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/coupon/public/active')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── GET /coupon/validate/:code ──────────────────────────────────────────────

  describe('GET /api/v1/coupon/validate/:code', () => {
    it('returns 200 when coupon is valid', async () => {
      prisma.coupon.findFirst.mockResolvedValue(mockCoupon);

      await request(app.getHttpServer())
        .get('/api/v1/coupon/validate/SAVE20')
        .expect(200);
    });

    it('returns 404 when coupon does not exist', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/coupon/validate/INVALID')
        .expect(404);
    });
  });

  // ── GET /coupon (admin) ─────────────────────────────────────────────────────

  describe('GET /api/v1/coupon', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/coupon')
        .expect(401);
    });

    it('returns 403 for customer role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/coupon')
        .set('Cookie', customerCookie())
        .expect(403);
    });

    it('returns 200 for admin', async () => {
      prisma.coupon.findMany.mockResolvedValue([mockCoupon]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/coupon')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── POST /coupon ────────────────────────────────────────────────────────────

  describe('POST /api/v1/coupon', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/coupon')
        .send({ code: 'NEW10', type: 'PERCENTAGE', value: 10 })
        .expect(401);
    });

    it('returns 400 on invalid body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/coupon')
        .set('Cookie', adminCookie())
        .send({})
        .expect(400);
    });

    it('returns 201 when admin creates coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue(mockCoupon);

      const res = await request(app.getHttpServer())
        .post('/api/v1/coupon')
        .set('Cookie', adminCookie())
        .send({
          code: 'SAVE20',
          type: 'PERCENTAGE',
          value: 20,
          minOrderValue: 100,
          maxUsage: 100,
          expiresAt: new Date(Date.now() + 86400_000).toISOString(),
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });
  });

  // ── DELETE /coupon/:id ──────────────────────────────────────────────────────

  describe('DELETE /api/v1/coupon/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/coupon/coupon-id')
        .expect(401);
    });

    it('returns 200 when admin deletes', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      prisma.coupon.delete.mockResolvedValue(mockCoupon);

      await request(app.getHttpServer())
        .delete('/api/v1/coupon/coupon-id')
        .set('Cookie', adminCookie())
        .expect(200);
    });
  });
});
