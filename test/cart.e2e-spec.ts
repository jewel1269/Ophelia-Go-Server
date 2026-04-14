import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { customerCookie, TEST_CUSTOMER } from './helpers/auth.helper';

const mockCart = {
  id: 'cart-id',
  userId: TEST_CUSTOMER.sub,
  items: [
    { id: 'item-1', productId: 'prod-id', quantity: 2, product: { price: 100 } },
  ],
};

describe('Cart (e2e)', () => {
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

  // ── GET /cart ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/cart', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/cart')
        .expect(401);
    });

    it('returns 200 for authenticated user', async () => {
      prisma.cart.findFirst.mockResolvedValue(mockCart);

      const res = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Cookie', customerCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── POST /cart/add ──────────────────────────────────────────────────────────

  describe('POST /api/v1/cart/add', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .send({ items: [{ productId: 'prod-id', quantity: 1 }] })
        .expect(401);
    });

    it('returns 400 when body is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Cookie', customerCookie())
        .send({})
        .expect(400);
    });

    it('returns 201 when valid items are added', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-id', price: 100, stock: 10 });
      prisma.cart.upsert.mockResolvedValue({ id: 'cart-id', userId: TEST_CUSTOMER.sub });
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({ id: 'item-1' });
      // getCart call at the end of addToCart uses findUnique
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Cookie', customerCookie())
        .send({ items: [{ productId: 'prod-id', quantity: 2 }] })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });
  });

  // ── PUT /cart/update ────────────────────────────────────────────────────────

  describe('PUT /api/v1/cart/update', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/cart/update')
        .send({ productId: 'prod-id', quantity: 3 })
        .expect(401);
    });
  });

  // ── DELETE /cart/remove/:productId ─────────────────────────────────────────

  describe('DELETE /api/v1/cart/remove/:productId', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/cart/remove/prod-id')
        .expect(401);
    });

    it('returns 200 when item is removed', async () => {
      const mockCartData = { id: 'cart-id', userId: TEST_CUSTOMER.sub };
      // removeFromCart: findUnique for cart, findFirst for item, then getCart via findUnique again
      prisma.cart.findUnique.mockResolvedValue({ ...mockCartData, items: [] });
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1' });
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app.getHttpServer())
        .delete('/api/v1/cart/remove/prod-id')
        .set('Cookie', customerCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });
});
