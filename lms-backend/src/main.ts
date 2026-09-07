import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; // NEW — the two pieces that build and serve the docs UI
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors();

  const swaggerConfig = new DocumentBuilder() // NEW — builds the metadata shown at the top of the docs page
    .setTitle('LMS API') // page title in the Swagger UI
    .setDescription('API documentation for the LMS backend') // subtitle text
    .setVersion('1.0') // just a version label, doesn't affect behavior
    .addBearerAuth() // registers the "Bearer token" auth scheme so protected routes get an "Authorize" button in the UI
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig); // scans all your controllers/DTOs and generates the spec
  SwaggerModule.setup('api-docs', app, document); // mounts the interactive UI at http://localhost:3000/api-docs

  await app.listen(3000, '0.0.0.0');
}
bootstrap();