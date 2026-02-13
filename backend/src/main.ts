import './polyfill';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Habilitar CORS para que el frontend pueda conectarse
  await app.listen(process.env.PORT || 3000, '0.0.0.0'); // Escuchar en todas las interfaces para Docker/Railway
}
bootstrap();
