import './polyfill';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './users/entities/user.entity';
import { BranchesService } from './branches/branches.service';
import { CurrenciesService } from './currencies/currencies.service';
import { CapitalService } from './capital/capital.service';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Habilitar CORS para que el frontend pueda conectarse
  
  console.log('--- INICIANDO SERVIDOR ERP YEISON ---');
  console.log('Versión del código: ' + new Date().toISOString());

  // === LIMPIEZA DE PRODUCCIÓN (ONE-TIME RUN) ===
  // Descomentar para borrar datos. Comentar después de usar.
  /*
  try {
    const dataSource = app.get(DataSource);
    console.log('⚠️ INICIANDO LIMPIEZA DE BASE DE DATOS... ⚠️');
    
    await dataSource.query(`DELETE FROM "payment"`);
    await dataSource.query(`DELETE FROM "exchange"`);
    await dataSource.query(`DELETE FROM "capital_movement"`);
    await dataSource.query(`DELETE FROM "sale"`);
    await dataSource.query(`DELETE FROM "purchase"`);
    await dataSource.query(`DELETE FROM "inventory"`);
    await dataSource.query(`DELETE FROM "global_inventory"`);
    await dataSource.query(`DELETE FROM "cash_audit"`);
    
    // Reset Capital
    await dataSource.query(`UPDATE "capital" SET "operativePlante" = 0, "accumulatedProfit" = 0`);
    
    console.log('✅ BASE DE DATOS LIMPIA (Usuarios y Configuración intactos)');
  } catch (err) {
    console.error('Error durante limpieza:', err);
  }
  */
  // === FIN LIMPIEZA ===

  // Seed de emergencia al iniciar la app
  try {
    const usersService = app.get(UsersService);
    const branchesService = app.get(BranchesService);
    const currenciesService = app.get(CurrenciesService);
    const capitalService = app.get(CapitalService);

    // 0. Ensure Global Capital
    await capitalService.getOrInitGlobalCapital();

    // 1. Create Branches
    const branches = ['Cúcuta', 'Caracas'];
    for (const branchName of branches) {
      const existing = (await branchesService.findAll()).find(b => b.name === branchName);
      if (!existing) {
        console.log(`Creating branch: ${branchName}...`);
        await branchesService.create({ 
          name: branchName, 
          address: 'Sede Principal'
        });
      }
    }

    // 2. Create Currencies
    const currencies = [
      { code: 'USDT', name: 'Tether (USDT)', symbol: '₮' },
      { code: 'EURO', name: 'Euro', symbol: '€' },
      { code: 'DÓLAR', name: 'Dólar Americano', symbol: '$' },
      { code: 'ZELLE', name: 'Zelle (Digital)', symbol: 'Z' },
      { code: 'BS', name: 'Bolívar Venezolano', symbol: 'Bs.' },
      { code: 'OTROS', name: 'Otras Divisas', symbol: '?' },
    ];
  
    for (const curr of currencies) {
      const allCurrencies = await currenciesService.findAll();
      const existing = allCurrencies.find(c => c.code === curr.code);
      if (!existing) {
        console.log(`Creating currency: ${curr.code}...`);
        await currenciesService.create(curr);
      }
    }

    // 3. Create Admin
    const adminUser = await usersService.findByUsername('Angeljaimes');
    if (!adminUser) {
      console.log('Creando usuario admin principal...');
      await usersService.create({
        username: 'Angeljaimes',
        password: 'password123',
        fullName: 'Angel Jaimes',
        role: UserRole.ADMIN,
        branchId: undefined,
      });
      console.log('Usuario admin creado: Angeljaimes / password123');
    }
  } catch (error) {
    console.error('Error en seed de emergencia:', error);
  }

  await app.listen(process.env.PORT || 3000, '0.0.0.0'); // Escuchar en todas las interfaces para Docker/Railway
}
bootstrap();
