import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  // Global Interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Socket.IO WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: [
      'https://ophelia.vercel.app',
      'http://localhost:3000',
      'https://opheliago.com',
      'www.opheliago.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  if (process.env.NODE_ENV !== 'production') {
    // Serve the auto-auth script as an external file so Helmet's
    // "script-src 'self'" CSP policy allows it (inline scripts are blocked).
    app.getHttpAdapter().get('/docs/auto-auth.js', (_req: any, res: any) => {
      res.setHeader('Content-Type', 'text/javascript');
      res.send(`
        (function () {
          function applyToken(token) {
            // 1. Set it in the live UI instance so requests work immediately.
            if (window.ui && typeof window.ui.preauthorizeApiKey === 'function') {
              window.ui.preauthorizeApiKey('bearer', token);
            }
            // 2. Write to localStorage in the exact format Swagger UI reads on
            //    startup when persistAuthorization: true is enabled.
            //    This makes the token survive a page reload.
            try {
              localStorage.setItem('authorized', JSON.stringify({
                bearer: {
                  name: 'bearer',
                  schema: { type: 'http', in: 'header', scheme: 'bearer', bearerFormat: 'JWT' },
                  value: token
                }
              }));
            } catch (e) {}
          }

          var origFetch = window.fetch;
          window.fetch = function () {
            return origFetch.apply(this, arguments).then(function (response) {
              response.clone().json().then(function (body) {
                var token = body && body.data && body.data.accessToken;
                if (token) { applyToken(token); }
              }).catch(function () {});
              return response;
            });
          };
        })();
      `);
    });

    const config = new DocumentBuilder()
      .setTitle('Ophelia API')
      .setDescription('The official API documentation for Ophelia')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
      customJs: '/docs/auto-auth.js',
    });
  }

  const PORT = process.env.PORT || 5000;
  await app.listen(PORT);

  logger.log(`🚀 Application is running on: http://localhost:${PORT}/api/v1`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📄 Swagger Docs available at: http://localhost:${PORT}/docs`);
  }
  logger.log(`📄 Swagger Docs available at: http://localhost:${PORT}/docs`);
  logger.log(`🔌 WebSocket gateway at: ws://localhost:${PORT}/notifications`);
}

bootstrap();
