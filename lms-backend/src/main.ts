import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { UPLOADS_ROOT, VIDEOS_DIR, IMAGES_DIR } from './uploads/uploads.constants';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true }); // NestExpressApplication needed for useStaticAssets below

  fs.mkdirSync(VIDEOS_DIR, { recursive: true }); // upload folders must exist before the first upload
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  app.use(
    helmet({
      // Helmet's default ("same-origin") makes the browser BLOCK videos/images served from
      // this API (port 3000) when they're embedded in the web app (port 5173). "cross-origin"
      // lets the frontend display uploaded media. Everything else stays locked down.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.useStaticAssets(UPLOADS_ROOT, { prefix: '/uploads/' }); // serves http://localhost:3000/uploads/videos/xyz.mp4 (supports Range requests, so video seeking works)

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const allowedOrigins = (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LMS API')
      .setDescription('API documentation for the LMS backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);
  }

  await app.listen(3000, '0.0.0.0');
}
bootstrap();