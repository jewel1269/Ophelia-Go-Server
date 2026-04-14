import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { setCache } from 'src/services/cache.service';

describe('Auth — Password Reset (e2e)', () => {
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

  // ── POST /auth/forgot-password ──────────────────────────────────────────────

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 201 and sends OTP when user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uid',
        email: 'user@test.com',
        name: 'Test User',
      });
      prisma.user.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'user@test.com' })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });

    it('returns 404 when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'notfound@test.com' })
        .expect(404);
    });

    it('returns 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({})
        .expect(400);
    });

    it('returns 400 when email format is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  // ── POST /auth/verify-otp ───────────────────────────────────────────────────

  describe('POST /api/v1/auth/verify-otp', () => {
    it('returns 201 when OTP is valid', async () => {
      // verifyOtp uses Redis cache — seed the key before calling the endpoint
      await setCache('otp:reset:user@test.com', '123456', 300);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ email: 'user@test.com', otp: '123456' })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });

    it('returns 400 when otp field is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ email: 'user@test.com' })
        .expect(400);
    });
  });

  // ── POST /auth/reset-password ───────────────────────────────────────────────

  describe('POST /api/v1/auth/reset-password', () => {
    it('returns 400 when new password is too short', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ email: 'user@test.com', otp: '123456', newPassword: '123' })
        .expect(400);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ email: 'user@test.com' })
        .expect(400);
    });
  });
});
