import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie } from './helpers/auth.helper';

const mockBrand = {
  id: 'brand-id',
  name: 'Nike',
  slug: 'nike',
  logo: null,
  createdAt: new Date().toISOString(),
};

describe('Brands (e2e)', () => {
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

  // ── GET /brands ─────────────────────────────────────────────────────────────

  describe('GET /api/v1/brands', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/brands')
        .expect(401);
    });

    it('returns 200 for admin', async () => {
      prisma.brand.findMany.mockResolvedValue([mockBrand]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/brands')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── POST /brands ────────────────────────────────────────────────────────────

  describe('POST /api/v1/brands', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/brands')
        .send({ name: 'Adidas' })
        .expect(401);
    });

    it('returns 403 for customer', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/brands')
        .set('Cookie', customerCookie())
        .send({ name: 'Adidas' })
        .expect(403);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/brands')
        .set('Cookie', adminCookie())
        .send({})
        .expect(400);
    });

    it('returns 201 when admin creates brand', async () => {
      prisma.brand.findFirst.mockResolvedValue(null);
      prisma.brand.create.mockResolvedValue(mockBrand);

      const res = await request(app.getHttpServer())
        .post('/api/v1/brands')
        .set('Cookie', adminCookie())
        .send({ name: 'Nike', slug: 'nike' })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });
  });

  // ── PATCH /brands/update/:id ────────────────────────────────────────────────

  describe('PATCH /api/v1/brands/update/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/brands/update/brand-id')
        .send({ name: 'Updated' })
        .expect(401);
    });

    it('returns 200 when admin updates', async () => {
      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.brand.update.mockResolvedValue({ ...mockBrand, name: 'Updated' });

      await request(app.getHttpServer())
        .patch('/api/v1/brands/update/brand-id')
        .set('Cookie', adminCookie())
        .send({ name: 'Updated' })
        .expect(200);
    });
  });

  // ── DELETE /brands/delete/:id ───────────────────────────────────────────────

  describe('DELETE /api/v1/brands/delete/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/brands/delete/brand-id')
        .expect(401);
    });

    it('returns 200 when admin deletes', async () => {
      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.brand.delete.mockResolvedValue(mockBrand);

      await request(app.getHttpServer())
        .delete('/api/v1/brands/delete/brand-id')
        .set('Cookie', adminCookie())
        .expect(200);
    });
  });
});
