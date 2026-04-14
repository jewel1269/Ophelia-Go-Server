import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/common/database/prisma.service';
import { EmailService } from 'src/services/email.service';
import { AiAssistantService } from 'src/modules/ai-assistant/ai-assistant.service';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { createPrismaMock, PrismaMock } from './prisma-mock';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaMock;
}

/** Mock EmailService so no real SMTP calls are made in tests. */
const emailServiceMock = {
  sendOtp: jest.fn().mockResolvedValue(undefined),
  sendCampaignEmail: jest.fn().mockResolvedValue(undefined),
};

/** Mock AiAssistantService so no real Google AI calls are made in tests. */
const aiAssistantServiceMock = {
  chat: jest.fn().mockResolvedValue({ reply: 'mock reply' }),
  getProductTitle: jest.fn().mockResolvedValue('Mock Product Title'),
};

/**
 * Bootstraps the full NestJS application for E2E tests.
 * PrismaService and EmailService are replaced with in-memory mocks.
 * The same global middleware stack as main.ts is applied.
 */
export const createTestApp = async (): Promise<TestApp> => {
  const prisma = createPrismaMock();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(EmailService)
    .useValue(emailServiceMock)
    .overrideProvider(AiAssistantService)
    .useValue(aiAssistantServiceMock)
    .compile();

  const app = moduleFixture.createNestApplication();

  // ── Mirror main.ts configuration ──────────────────────────────────────────
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  // ──────────────────────────────────────────────────────────────────────────

  await app.init();
  return { app, prisma };
};
