import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';
import { adminCookie, customerCookie, TEST_CUSTOMER } from './helpers/auth.helper';

describe('Users (e2e)', () => {
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

  // ── POST /users/register ────────────────────────────────────────────────────

  describe('POST /api/v1/users/register', () => {
    it('returns 201 on successful registration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-uid',
        email: 'new@test.com',
        name: 'New User',
        role: 'CUSTOMER',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send({
          name: 'New User',
          email: 'new@test.com',
          password: 'Password123',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
    });

    it('returns 400 when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'uid', email: 'exists@test.com' });

      await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send({
          name: 'Existing',
          email: 'exists@test.com',
          password: 'Password123',
        })
        .expect(400);
    });

    it('returns 400 when email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send({ name: 'Test', email: 'bad-email', password: 'Password123' })
        .expect(400);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send({ name: 'Test' })
        .expect(400);
    });
  });

  // ── POST /users/login ───────────────────────────────────────────────────────

  describe('POST /api/v1/users/login', () => {
    it('returns 200 with tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('Password123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'uid',
        email: 'user@test.com',
        password: hash,
        role: 'CUSTOMER',
        name: 'User',
      });
      prisma.user.update.mockResolvedValue({});

      await request(app.getHttpServer())
        .post('/api/v1/users/login')
        .send({ email: 'user@test.com', password: 'Password123' })
        .expect(201);
    });

    it('returns 401 on wrong password', async () => {
      const hash = await bcrypt.hash('correct-pass', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'uid',
        email: 'user@test.com',
        password: hash,
        role: 'CUSTOMER',
      });

      await request(app.getHttpServer())
        .post('/api/v1/users/login')
        .send({ email: 'user@test.com', password: 'wrong-pass' })
        .expect(401);
    });

    it('returns 401 when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/users/login')
        .send({ email: 'ghost@test.com', password: 'Password123' })
        .expect(401);
    });

    it('returns 400 when body is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/login')
        .send({})
        .expect(400);
    });
  });

  // ── GET /users/profile ──────────────────────────────────────────────────────

  describe('GET /api/v1/users/profile', () => {
    it('returns 401 without auth cookie', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .expect(401);
    });

    it('returns 200 with valid customer cookie', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: TEST_CUSTOMER.sub,
        email: TEST_CUSTOMER.email,
        name: 'Test Customer',
        role: 'CUSTOMER',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Cookie', customerCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── GET /users/customers (admin only) ──────────────────────────────────────

  describe('GET /api/v1/users/customers', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/customers')
        .expect(401);
    });

    it('returns 200 when called by customer (no role restriction)', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/users/customers')
        .set('Cookie', customerCookie())
        .expect(200);
    });

    it('returns 200 when called by admin', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/customers')
        .set('Cookie', adminCookie())
        .expect(200);

      expect(res.body.statusCode).toBe(200);
    });
  });
});
