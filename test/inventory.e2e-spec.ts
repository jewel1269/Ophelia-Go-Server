import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie } from './helpers/auth.helper';

describe('Inventory (e2e)', () => {
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

  // Helper: test that a GET route requires admin auth
  const requiresAdmin = (route: string) => {
    it(`${route} → 401 without auth`, async () => {
      await request(app.getHttpServer()).get(route).expect(401);
    });
    it(`${route} → 403 for customer`, async () => {
      await request(app.getHttpServer())
        .get(route)
        .set('Cookie', customerCookie())
        .expect(403);
    });
  };

  // ── Stock ───────────────────────────────────────────────────────────────────

  describe('GET /api/v1/inventory/stock', () => {
    requiresAdmin('/api/v1/inventory/stock');

    it('returns 200 for admin', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([]);
      prisma.inventoryItem.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/stock')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/inventory/stock/stats', () => {
    requiresAdmin('/api/v1/inventory/stock/stats');

    it('returns 200 for admin', async () => {
      prisma.inventoryItem.count.mockResolvedValue(0);
      prisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/stock/stats')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/inventory/stock/low-stock', () => {
    requiresAdmin('/api/v1/inventory/stock/low-stock');

    it('returns 200 for admin', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/inventory/stock/low-stock')
        .set('Cookie', adminCookie())
        .expect(200);
    });
  });

  describe('GET /api/v1/inventory/stock/out-of-stock', () => {
    requiresAdmin('/api/v1/inventory/stock/out-of-stock');

    it('returns 200 for admin', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/inventory/stock/out-of-stock')
        .set('Cookie', adminCookie())
        .expect(200);
    });
  });

  // ── Locations ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/inventory/locations', () => {
    requiresAdmin('/api/v1/inventory/locations');

    it('returns 200 for admin', async () => {
      prisma.inventoryLocation.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/inventory/locations')
        .set('Cookie', adminCookie())
        .expect(200);
    });
  });

  // ── Suppliers ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/inventory/suppliers', () => {
    requiresAdmin('/api/v1/inventory/suppliers');

    it('returns 200 for admin', async () => {
      prisma.supplier.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/inventory/suppliers')
        .set('Cookie', adminCookie())
        .expect(200);
    });
  });

  // ── Purchase Orders ─────────────────────────────────────────────────────────

  describe('GET /api/v1/inventory/purchase-orders', () => {
    requiresAdmin('/api/v1/inventory/purchase-orders');

    it('returns 200 for admin', async () => {
      prisma.purchaseOrder.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/inventory/purchase-orders')
        .set('Cookie', adminCookie())
        .expect(200);
    });
  });
});
