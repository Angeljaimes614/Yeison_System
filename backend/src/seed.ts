import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { CapitalService } from './capital/capital.service';
import { BranchesService } from './branches/branches.service';
import { CurrenciesService } from './currencies/currencies.service';
import { UserRole } from './users/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const usersService = app.get(UsersService);
  const capitalService = app.get(CapitalService);
  const branchesService = app.get(BranchesService);
  const currenciesService = app.get(CurrenciesService);

  // 1. Create Global Capital
  console.log('Checking Global Capital...');
  const capital = await capitalService.getOrInitGlobalCapital();
  console.log('Global Capital ensured:', capital.id);

  // 2. Create Branches (Cúcuta & Caracas)
  const branches = ['Cúcuta', 'Caracas'];
  for (const branchName of branches) {
    const existing = (await branchesService.findAll()).find(b => b.name === branchName);
    if (!existing) {
      console.log(`Creating branch: ${branchName}...`);
      await branchesService.create({ 
        name: branchName, 
        address: 'Sede Principal', 
        phone: '0000000000' 
      });
    }
  }

  // 3. Create Currencies (USD, EUR, VES)
  const currencies = [
    { code: 'USD', name: 'Dólar Americano', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'VES', name: 'Bolívar Venezolano', symbol: 'Bs.' },
  ];

  for (const curr of currencies) {
    const existing = (await currenciesService.findAll()).find(c => c.code === curr.code);
    if (!existing) {
      console.log(`Creating currency: ${curr.code}...`);
      await currenciesService.create(curr);
    }
  }

  // 4. Create Admin User
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
      branchId: undefined, // Admin is Global
    });
    console.log(`User ${username} created successfully.`);
  } else {
    console.log(`User ${username} already exists.`);
  }

  await app.close();
}

bootstrap();
