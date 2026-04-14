import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie, TEST_CUSTOMER } from './helpers/auth.helper';

const mockReview = {
  id: 'review-id',
  productId: 'prod-id',
  userId: TEST_CUSTOMER.sub,
  rating: 5,
  comment: 'Great product!',
  createdAt: new Date().toISOString(),
  user: { name: 'Customer', avatar: null },
};

describe('Reviews (e2e)', () => {
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

  // ── GET /review/:productId ──────────────────────────────────────────────────

  describe('GET /api/v1/review/:productId', () => {
    it('returns 200 with product reviews (public)', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview]);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { id: 1 },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/review/prod-id')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── GET /review/all ─────────────────────────────────────────────────────────

  describe('GET /api/v1/review/all', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/review/all')
        .expect(401);
    });

    it('returns 200 for admin', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview]);
      prisma.review.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/review/all')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── POST /review/:productId ─────────────────────────────────────────────────

  describe('POST /api/v1/review/:productId', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/review/prod-id')
        .send({ rating: 5, comment: 'Nice' })
        .expect(401);
    });

    it('returns 400 when rating is out of range', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/review/prod-id')
        .set('Cookie', customerCookie())
        .send({ rating: 10, comment: 'Nice' })
        .expect(400);
    });

    it('returns 201 on valid submission', async () => {
      prisma.review.findFirst.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue(mockReview);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { id: 1 },
      });
      prisma.product.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/api/v1/review/prod-id')
        .set('Cookie', customerCookie())
        .send({ rating: 5, comment: 'Great product!' })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });
  });

  // ── DELETE /review/delete/:id ───────────────────────────────────────────────

  describe('DELETE /api/v1/review/delete/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/review/delete/review-id')
        .expect(401);
    });

    it('returns 200 when admin deletes review', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview);
      prisma.review.delete.mockResolvedValue(mockReview);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 0 },
        _count: { id: 0 },
      });
      prisma.product.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .delete('/api/v1/review/delete/review-id')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });
});
