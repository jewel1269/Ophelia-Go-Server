import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie } from './helpers/auth.helper';

const mockCategory = {
  id: 'cat-id',
  name: 'Electronics',
  slug: 'electronics',
  image: null,
  createdAt: new Date().toISOString(),
};

describe('Categories (e2e)', () => {
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

  // ── GET /categories ─────────────────────────────────────────────────────────

  describe('GET /api/v1/categories', () => {
    it('returns 200 with list (public)', async () => {
      prisma.category.findMany.mockResolvedValue([mockCategory]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── POST /categories/create ─────────────────────────────────────────────────

  describe('POST /api/v1/categories/create', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/categories/create')
        .send({ name: 'New Category' })
        .expect(401);
    });

    it('returns 403 for customer role', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/categories/create')
        .set('Cookie', customerCookie())
        .send({ name: 'New Category' })
        .expect(403);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/categories/create')
        .set('Cookie', adminCookie())
        .send({})
        .expect(400);
    });

    it('returns 201 when admin creates category', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(mockCategory);

      const res = await request(app.getHttpServer())
        .post('/api/v1/categories/create')
        .set('Cookie', adminCookie())
        .send({ name: 'New Category' })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });
  });

  // ── PATCH /categories/update/:id ────────────────────────────────────────────

  describe('PATCH /api/v1/categories/update/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/categories/update/cat-id')
        .send({ name: 'Updated' })
        .expect(401);
    });

    it('returns 200 when admin updates', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue({ ...mockCategory, name: 'Updated' });

      await request(app.getHttpServer())
        .patch('/api/v1/categories/update/cat-id')
        .set('Cookie', adminCookie())
        .send({ name: 'Updated' })
        .expect(200);
    });
  });

  // ── DELETE /categories/delete/:id ───────────────────────────────────────────

  describe('DELETE /api/v1/categories/delete/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/categories/delete/cat-id')
        .expect(401);
    });

    it('returns 200 when admin deletes', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.delete.mockResolvedValue(mockCategory);

      await request(app.getHttpServer())
        .delete('/api/v1/categories/delete/cat-id')
        .set('Cookie', adminCookie())
        .expect(200);
    });
  });
});
