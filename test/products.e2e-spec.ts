import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie } from './helpers/auth.helper';

const mockProduct = {
  id: 'prod-id',
  name: 'Test Product',
  slug: 'test-product',
  price: 100,
  stock: 50,
  rating: 0,
  averageRating: 0,
  orderCount: 0,
  images: [],
  variants: [],
  category: { id: 'cat-id', name: 'Category' },
  brand: null,
  createdAt: new Date().toISOString(),
};

describe('Products (e2e)', () => {
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

  // ── GET /products/all ───────────────────────────────────────────────────────

  describe('GET /api/v1/products/all', () => {
    it('returns 200 and product list (public)', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);
      prisma.product.count.mockResolvedValue(1);
      prisma.review.groupBy.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/products/all')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });

    it('returns 200 with pagination params', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);
      prisma.review.groupBy.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/products/all?page=1&limit=10')
        .expect(200);
    });
  });

  // ── GET /products/shop ──────────────────────────────────────────────────────

  describe('GET /api/v1/products/shop', () => {
    it('returns 200 (public)', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);
      prisma.review.groupBy.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/products/shop')
        .expect(200);
    });
  });

  // ── GET /products/:id ───────────────────────────────────────────────────────

  describe('GET /api/v1/products/:id', () => {
    it('returns 200 when product exists', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      const res = await request(app.getHttpServer())
        .get('/api/v1/products/prod-id')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });

    it('returns 404 when product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/products/nonexistent-id')
        .expect(404);
    });
  });

  // ── POST /products/create (admin only) ─────────────────────────────────────

  describe('POST /api/v1/products/create', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products/create')
        .send({ name: 'Product', price: 100 })
        .expect(401);
    });

    it('returns 403 when called by customer', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products/create')
        .set('Cookie', customerCookie())
        .send({ name: 'Product', price: 100 })
        .expect(403);
    });

    it('returns 400 on invalid body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products/create')
        .set('Cookie', adminCookie())
        .send({})
        .expect(400);
    });

    it('returns 201 when admin creates valid product', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-id', name: 'Cat' });
      prisma.product.create.mockResolvedValue(mockProduct);

      const res = await request(app.getHttpServer())
        .post('/api/v1/products/create')
        .set('Cookie', adminCookie())
        .send({
          name: 'New Product',
          slug: 'new-product',
          description: 'A great product',
          price: 199.99,
          stock: 100,
          sku: 'NP-001',
          categoryId: 'cat-id',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });
  });

  // ── PATCH /products/:id (admin only) ───────────────────────────────────────

  describe('PATCH /api/v1/products/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/products/prod-id')
        .send({ price: 150 })
        .expect(401);
    });

    it('returns 403 for customer', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/products/prod-id')
        .set('Cookie', customerCookie())
        .send({ price: 150 })
        .expect(403);
    });

    it('returns 200 when admin updates product', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({ ...mockProduct, price: 150 });

      await request(app.getHttpServer())
        .patch('/api/v1/products/prod-id')
        .set('Cookie', adminCookie())
        .send({ price: 150 })
        .expect(200);
    });
  });

  // ── DELETE /products/delete/:id (admin only) ────────────────────────────────

  describe('DELETE /api/v1/products/delete/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/products/delete/prod-id')
        .expect(401);
    });

    it('returns 200 when admin deletes product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        orderItems: [],
        reviews: [],
        cartItems: [],
        wishlistItems: [],
        flashSaleItems: [],
        variants: [],
      });
      prisma.product.delete.mockResolvedValue(mockProduct);

      await request(app.getHttpServer())
        .delete('/api/v1/products/delete/prod-id')
        .set('Cookie', adminCookie())
        .expect(200);
    });
  });
});
