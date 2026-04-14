import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';

const mockBanner = {
  id: 'banner-id',
  title: 'Summer Sale',
  image: 'https://example.com/banner.jpg',
  isActive: true,
  createdAt: new Date().toISOString(),
};

// NOTE: BannerController has no auth guards — all routes are public.

describe('Banner (e2e)', () => {
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

  // ── GET /banner/active ──────────────────────────────────────────────────────

  describe('GET /api/v1/banner/active', () => {
    it('returns 200 (public)', async () => {
      prisma.banner.findMany.mockResolvedValue([mockBanner]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/banner/active')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── DELETE /banner/delete/:id ───────────────────────────────────────────────

  describe('DELETE /api/v1/banner/delete/:id', () => {
    it('returns 404 when banner does not exist', async () => {
      prisma.banner.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/api/v1/banner/delete/nonexistent-id')
        .expect(404);
    });

    it('returns 200 when banner is deleted', async () => {
      prisma.banner.findUnique.mockResolvedValue(mockBanner);
      prisma.banner.delete.mockResolvedValue(mockBanner);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/banner/delete/banner-id')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── PATCH /banner/status/:id ────────────────────────────────────────────────

  describe('PATCH /api/v1/banner/status/:id', () => {
    it('returns 404 when banner does not exist', async () => {
      prisma.banner.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/api/v1/banner/status/nonexistent-id')
        .expect(404);
    });

    it('returns 200 when banner status is toggled', async () => {
      prisma.banner.findUnique.mockResolvedValue(mockBanner);
      prisma.banner.update.mockResolvedValue({ ...mockBanner, isActive: false });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/banner/status/banner-id')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });
});
