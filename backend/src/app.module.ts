import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { CapitalModule } from './capital/capital.module';
import { InventoryModule } from './inventory/inventory.module';
import { ClientsModule } from './clients/clients.module';
import { ProvidersModule } from './providers/providers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PaymentsModule } from './payments/payments.module';
import { CashAuditModule } from './cash-audit/cash-audit.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Auto-create tables (dev only)
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    BranchesModule,
    CurrenciesModule,
    CapitalModule,
    InventoryModule,
    ClientsModule,
    ProvidersModule,
    PurchasesModule,
    SalesModule,
    ExpensesModule,
    PaymentsModule,
    CashAuditModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
