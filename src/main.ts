// Workaround for Aiven self-signed certificates - MUST be set before any SSL connections
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// Load environment variables before anything else
import { config } from 'dotenv';
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation and transformation (snake_case to camelCase)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payloads to DTO instances
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: false, // Don't throw error for non-whitelisted properties
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
    }),
  );

  app.use(cookieParser());
  app.enableShutdownHooks();

  const defaultOrigins = [
    'http://localhost:5173',
    'https://siraatt.vercel.app',
  ];
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || defaultOrigins,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${port}`);
}
bootstrap();
