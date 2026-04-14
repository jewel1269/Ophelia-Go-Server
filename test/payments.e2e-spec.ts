import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie, superAdminCookie, TEST_CUSTOMER } from './helpers/auth.helper';

const mockPayment = {
  id: 'payment-id',
  orderId: 'order-id',
  method: 'SSLCOMMERZ',
  status: 'PENDING',
  amount: 500,
  currency: 'BDT',
  transactionId: 'txn-001',
  createdAt: new Date().toISOString(),
};

const mockGatewayConfig = {
  id: 'gw-id',
  name: 'sslcommerz',
  isActive: true,
  environment: 'SANDBOX',
  credentials: {},
  createdAt: new Date().toISOString(),
};

describe('Payments (e2e)', () => {
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

  // ── POST /payments/initiate ─────────────────────────────────────────────────

  describe('POST /api/v1/payments/initiate', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .send({ orderId: 'order-id', method: 'sslcommerz' })
        .expect(401);
    });

    it('returns 400 when body is missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Cookie', customerCookie())
        .send({})
        .expect(400);
    });

    it('returns 404 when order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Cookie', customerCookie())
        .send({ orderId: 'nonexistent-id', method: 'sslcommerz' })
        .expect(404);
    });
  });

  // ── POST /payments/callback/:gateway/success ───────────────────────────────

  describe('POST /api/v1/payments/callback/:gateway/success', () => {
    it('returns 400 when tran_id is missing from body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/callback/sslcommerz/success')
        .send({})
        .expect(400);
    });
  });

  // ── GET /payments (admin) ───────────────────────────────────────────────────

  describe('GET /api/v1/payments', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments')
        .expect(401);
    });

    it('returns 403 for customer', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments')
        .set('Cookie', customerCookie())
        .expect(403);
    });

    it('returns 200 for admin', async () => {
      prisma.payment.findMany.mockResolvedValue([mockPayment]);
      prisma.payment.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/payments')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── GET /payments/:id (admin) ───────────────────────────────────────────────

  describe('GET /api/v1/payments/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments/payment-id')
        .expect(401);
    });

    it('returns 404 when payment not found', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/payments/nonexistent-id')
        .set('Cookie', adminCookie())
        .expect(404);
    });

    it('returns 200 when payment exists', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/payment-id')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── GET /payment-gateways/public/active (public) ───────────────────────────

  describe('GET /api/v1/payment-gateways/public/active', () => {
    it('returns 200 (public, no auth needed)', async () => {
      prisma.paymentGatewayConfig.findMany.mockResolvedValue([mockGatewayConfig]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/payment-gateways/public/active')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── GET /payment-gateways (admin) ──────────────────────────────────────────

  describe('GET /api/v1/payment-gateways', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payment-gateways')
        .expect(401);
    });

    it('returns 403 for customer', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payment-gateways')
        .set('Cookie', customerCookie())
        .expect(403);
    });

    it('returns 200 for admin', async () => {
      prisma.paymentGatewayConfig.findMany.mockResolvedValue([mockGatewayConfig]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/payment-gateways')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── POST /payment-gateways (admin) ─────────────────────────────────────────

  describe('POST /api/v1/payment-gateways', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payment-gateways')
        .send({ name: 'sslcommerz', credentials: {}, environment: 'SANDBOX' })
        .expect(401);
    });

    it('returns 403 for customer', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payment-gateways')
        .set('Cookie', customerCookie())
        .send({ name: 'sslcommerz', credentials: {}, environment: 'SANDBOX' })
        .expect(403);
    });

    it('returns 201 when admin creates gateway config', async () => {
      prisma.paymentGatewayConfig.findUnique.mockResolvedValue(null);
      prisma.paymentGatewayConfig.create.mockResolvedValue(mockGatewayConfig);

      const res = await request(app.getHttpServer())
        .post('/api/v1/payment-gateways')
        .set('Cookie', adminCookie())
        .send({
          name: 'sslcommerz',
          displayName: 'SSLCommerz',
          credentials: { storeId: 'test' },
          environment: 'SANDBOX',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });
  });

  // ── DELETE /payment-gateways/:id (super admin only) ────────────────────────

  describe('DELETE /api/v1/payment-gateways/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/payment-gateways/gw-id')
        .expect(401);
    });

    it('returns 403 for regular admin', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/payment-gateways/gw-id')
        .set('Cookie', adminCookie())
        .expect(403);
    });

    it('returns 200 when super admin deletes config', async () => {
      prisma.paymentGatewayConfig.findUnique.mockResolvedValue(mockGatewayConfig);
      prisma.paymentGatewayConfig.delete.mockResolvedValue(mockGatewayConfig);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/payment-gateways/gw-id')
        .set('Cookie', superAdminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });
});
