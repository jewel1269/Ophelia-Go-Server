import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-app';

describe('AI Assistant (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /ai/chat ───────────────────────────────────────────────────────────

  describe('POST /api/v1/ai/chat', () => {
    it('returns 201 with AI reply on valid message (public)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .send({ message: 'Hello, what products do you have?' })
        .expect(201);

      expect(res.body).toBeDefined();
    });

    it('returns 400 when message field is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .send({})
        .expect(400);
    });

    it('returns 400 when message is not a string', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .send({ message: 123 })
        .expect(400);
    });

    it('accepts optional userId and history fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .send({
          message: 'I want to buy a shirt',
          userId: 'user-123',
          history: [
            { role: 'user', parts: [{ text: 'Hi' }] },
            { role: 'model', parts: [{ text: 'Hello! How can I help?' }] },
          ],
        })
        .expect(201);

      expect(res.body).toBeDefined();
    });
  });

  // ── POST /ai/analyze ────────────────────────────────────────────────────────

  describe('POST /api/v1/ai/analyze', () => {
    it('returns 400 when no image file is attached', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/analyze')
        .expect(400);
    });

    it('returns 201 with product title when image is uploaded', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/analyze')
        .attach('image', Buffer.from('fake-image-data'), {
          filename: 'product.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(res.body).toHaveProperty('title');
    });
  });
});
