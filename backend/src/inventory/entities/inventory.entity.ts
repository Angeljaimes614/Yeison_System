import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Currency } from '../../currencies/entities/currency.entity';

@Entity()
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  currencyId: string;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;

  // Lotes por compra (FIFO)
  @Column('decimal', { precision: 16, scale: 2 })
  originalAmount: number;

  @Column('decimal', { precision: 16, scale: 2 })
  currentBalance: number;

  @Column('decimal', { precision: 16, scale: 2 })
  purchaseRate: number; // Tasa de compra original

  @Column({ default: 'active' }) // active, depleted
  status: string;

  @CreateDateColumn()
  purchaseDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
