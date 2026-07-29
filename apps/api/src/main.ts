// ============================================================
// NestJS Application Bootstrap — Enterprise Configuration
// ============================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { JsonLoggerService } from './common/logger/json-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(JsonLoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  // ── Security ────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
          fontSrc: ["'self'", 'fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
          frameAncestors: ["'none'"],
        },
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Force HTTPS for a year once served over TLS. Only meaningful behind a
      // TLS terminator — harmless over plain HTTP.
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      // Don't leak the framework in headers.
      hidePoweredBy: true,
      noSniff: true,
      // Keep cross-origin isolation defaults; storage is a separate origin.
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // Deny access to browser hardware/APIs the platform never uses, so an
  // injected script can't reach them either.
  app.use((_req: any, res: any, next: any) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=()',
    );
    next();
  });
  // Compress responses > 1 KB at level 6 (good balance of speed vs size)
  app.use(compression({ level: 6, threshold: 1024 }));
  app.use(cookieParser());

  // ── CORS ────────────────────────────────────────────────
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  });

  // ── API Versioning ──────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ── Validation ──────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Swagger Documentation ───────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Enterprise SaaS Platform API')
      .setDescription('Business discovery, verified commerce, and civic notifications')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Tenant-Id', in: 'header' }, 'tenant-id')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // ── Start ───────────────────────────────────────────────
  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
