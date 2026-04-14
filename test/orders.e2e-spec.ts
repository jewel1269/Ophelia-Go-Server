import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie, TEST_CUSTOMER } from './helpers/auth.helper';

const mockOrder = {
  id: 'order-id',
  orderNumber: 'ORD-001',
  userId: TEST_CUSTOMER.sub,
  status: 'PENDING',
  totalAmount: 500,
  subTotal: 500,
  shippingCost: 0,
  discountAmount: 0,
  shippingAddress: {},
  createdAt: new Date().toISOString(),
  orderItems: [],
};

describe('Orders (e2e)', () => {
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

  // ── POST /orders ────────────────────────────────────────────────────────────

  describe('POST /api/v1/orders', () => {
    it('returns 401 without auth cookie', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ paymentMethod: 'COD', shippingAddress: {} })
        .expect(401);
    });

    it('returns 400 when cart is empty', async () => {
      prisma.cart.findFirst.mockResolvedValue({ id: 'cart-id', items: [] });

      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Cookie', customerCookie())
        .send({ paymentMethod: 'COD', shippingAddress: { street: '1 Main St' } })
        .expect(400);
    });
  });

  // ── GET /orders (admin only) ─────────────────────────────────────────────────

  describe('GET /api/v1/orders', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/orders')
        .expect(401);
    });

    it('returns 200 when admin fetches all orders', async () => {
      prisma.order.findMany.mockResolvedValue([mockOrder]);
      prisma.order.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── GET /orders/my-orders (customer only) ──────────────────────────────────

  describe('GET /api/v1/orders/my-orders', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/orders/my-orders?status=PENDING')
        .expect(401);
    });

    it('returns 200 for authenticated customer', async () => {
      prisma.order.findMany.mockResolvedValue([mockOrder]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/orders/my-orders?status=PENDING')
        .set('Cookie', customerCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── GET /orders/details/:id (public — no guard) ────────────────────────────

  describe('GET /api/v1/orders/details/:id', () => {
    it('returns 200 when order exists (public route)', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      const res = await request(app.getHttpServer())
        .get('/api/v1/orders/details/order-id')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── PUT /orders/update-status/:id (public — no guard) ─────────────────────

  describe('PUT /api/v1/orders/update-status/:id', () => {
    it('returns 200 when updating order status', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'PROCESSING' });

      const res = await request(app.getHttpServer())
        .put('/api/v1/orders/update-status/order-id')
        .send({ status: 'PROCESSING' })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });
});
