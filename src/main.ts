import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  // Middleware para leer y escribir Cookies httpOnly
  app.use(cookieParser());

  const corsOrigins = (
    configService.get<string>('CORS_ORIGINS') ||
    'http://localhost:5173,http://localhost:5174'
  )
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true, // Indispensable para el envío automático de cookies httpOnly
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const cookieName =
    configService.get<string>('COOKIE_NAME') || 'sonateca_access_token';

  // Configuración de Swagger (OpenAPI)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SONATECA ACCESS — API REST')
    .setDescription(
      'Documentación interactiva de endpoints para el ecosistema SONATECA ACCESS. Incluye Auth por Cookies, Gestión de Eventos, Invitaciones QR y Control de Acceso en Puerta (Scanner).',
    )
    .setVersion('1.0.0')
    .addCookieAuth(cookieName, {
      type: 'apiKey',
      in: 'cookie',
      name: cookieName,
      description:
        'Cookie httpOnly seteada automáticamente al iniciar sesión en /api/v1/auth/login',
    })
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token de acceso del Productor / SuperAdmin',
      },
      'access-token',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token devuelto por /api/v1/scanner/auth al ingresar el PIN de 6 dígitos',
      },
      'scanner-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      withCredentials: true,
    },
    customSiteTitle: 'SONATECA ACCESS — Swagger UI',
  });

  const port = Number(configService.get<string>('PORT')) || 3000;
  await app.listen(port);
  logger.log(
    `🚀 SONATECA ACCESS Backend corriendo en: http://localhost:${port}/api/v1`,
  );
  logger.log(
    `📘 Documentación Swagger disponible en: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
