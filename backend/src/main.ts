import './polyfill';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './users/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Habilitar CORS para que el frontend pueda conectarse
  
  // Seed de emergencia al iniciar la app
  try {
    const usersService = app.get(UsersService);
    const adminUser = await usersService.findByUsername('admin');
    if (!adminUser) {
      console.log('Creando usuario admin de emergencia...');
      await usersService.create({
        username: 'admin',
        password: 'password123',
        fullName: 'Admin Emergencia',
        role: UserRole.ADMIN,
        branchId: undefined,
      });
      console.log('Usuario admin creado: admin / password123');
    }
  } catch (error) {
    console.error('Error en seed de emergencia:', error);
  }

  await app.listen(process.env.PORT || 3000, '0.0.0.0'); // Escuchar en todas las interfaces para Docker/Railway
}
bootstrap();
