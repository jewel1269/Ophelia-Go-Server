import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaMock } from './helpers/prisma-mock';

describe('App bootstrap (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/categories returns 200 — app bootstraps correctly', async () => {
    prisma.category.findMany.mockResolvedValue([]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);

    expect(res.body.statusCode).toBe(200);
  });
});
