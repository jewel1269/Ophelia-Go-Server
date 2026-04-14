import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie } from './helpers/auth.helper';

const mockNotification = {
  id: 'notif-id',
  type: 'NEW_ORDER',
  title: 'New Order',
  message: 'A new order was placed',
  isRead: false,
  data: {},
  createdAt: new Date().toISOString(),
};

describe('Notifications (e2e)', () => {
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

  // ── GET /notifications ─────────────────────────────────────────────────────

  describe('GET /api/v1/notifications', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });

    it('returns 403 for customer role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', customerCookie())
        .expect(403);
    });

    it('returns 200 for admin', async () => {
      prisma.adminNotification.findMany.mockResolvedValue([mockNotification]);
      prisma.adminNotification.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── GET /notifications/unread-count ────────────────────────────────────────

  describe('GET /api/v1/notifications/unread-count', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .expect(401);
    });

    it('returns 200 for admin', async () => {
      prisma.adminNotification.count.mockResolvedValue(3);

      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── PATCH /notifications/mark-all-read ─────────────────────────────────────

  describe('PATCH /api/v1/notifications/mark-all-read', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/mark-all-read')
        .expect(401);
    });

    it('returns 200 for admin', async () => {
      prisma.adminNotification.updateMany.mockResolvedValue({ count: 3 });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/mark-all-read')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── PATCH /notifications/:id/read ──────────────────────────────────────────

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/notif-id/read')
        .expect(401);
    });

    it('returns 200 when admin marks notification as read', async () => {
      prisma.adminNotification.findUnique.mockResolvedValue(mockNotification);
      prisma.adminNotification.update.mockResolvedValue({ ...mockNotification, isRead: true });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/notif-id/read')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── DELETE /notifications/:id ──────────────────────────────────────────────

  describe('DELETE /api/v1/notifications/:id', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/notifications/notif-id')
        .expect(401);
    });

    it('returns 200 when admin deletes notification', async () => {
      prisma.adminNotification.findUnique.mockResolvedValue(mockNotification);
      prisma.adminNotification.delete.mockResolvedValue(mockNotification);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/notifications/notif-id')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });
});
