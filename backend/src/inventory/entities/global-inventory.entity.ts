import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Currency } from '../../currencies/entities/currency.entity';

@Entity()
export class GlobalInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  currencyId: string;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  totalQuantity: number;

  // Costo total acumulado en COP
  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  totalCostCOP: number;

  // Costo promedio ponderado (unitario)
  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  averageCost: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
