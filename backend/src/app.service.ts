import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async resetDatabase() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      // Order matters due to Foreign Keys
      await queryRunner.query(`DELETE FROM "payment"`);
      await queryRunner.query(`DELETE FROM "exchange"`);
      await queryRunner.query(`DELETE FROM "investment_transaction"`);
      await queryRunner.query(`DELETE FROM "investment_products"`);
      await queryRunner.query(`DELETE FROM "sale"`);
      await queryRunner.query(`DELETE FROM "purchase"`);
      await queryRunner.query(`DELETE FROM "old_debt"`);
      await queryRunner.query(`DELETE FROM "cash_audit"`);
      await queryRunner.query(`DELETE FROM "capital_movement"`);
      
      // Reset Inventory but keep currencies? Or delete currencies?
      // User said "Delete Everything". Let's keep Currencies as they are configuration.
      // But we must reset quantities.
      await queryRunner.query(`UPDATE "global_inventory" SET "totalQuantity" = 0, "totalCostCOP" = 0, "averageCost" = 0`);
      
      // Reset Capital
      await queryRunner.query(`UPDATE "capital" SET "operativePlante" = 0, "accumulatedProfit" = 0`);

      return { message: 'Base de datos reiniciada correctamente' };
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
