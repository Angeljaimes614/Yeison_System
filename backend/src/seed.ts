import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { CapitalService } from './capital/capital.service';
import { UserRole } from './users/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const usersService = app.get(UsersService);
  const capitalService = app.get(CapitalService);

  // 1. Create Global Capital
  console.log('Checking Global Capital...');
  const capital = await capitalService.getOrInitGlobalCapital();
  console.log('Global Capital ensured:', capital.id);

  // 2. Create Admin User
  const username = 'Angeljaimes';
  const password = '0917'; // Will be hashed by service
  
  const existingUser = await usersService.findByUsername(username);
  if (!existingUser) {
    console.log(`Creating user ${username}...`);
    await usersService.create({
      username,
      password,
      fullName: 'Angel Jaimes',
      role: UserRole.ADMIN,
      branchId: undefined, // Admin usually doesn't need specific branch, or we can create a default one
    });
    console.log(`User ${username} created successfully.`);
  } else {
    console.log(`User ${username} already exists.`);
  }

  await app.close();
}

bootstrap();
