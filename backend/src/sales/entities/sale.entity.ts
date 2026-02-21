import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Currency } from '../../currencies/entities/currency.entity';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  date: Date;

  @Column()
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  clientId: string;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ nullable: true })
  clientName: string;

  @Column()
  currencyId: string;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;

  @Column('decimal', { precision: 16, scale: 2 })
  amount: number; // Monto en moneda extranjera

  @Column('decimal', { precision: 16, scale: 2 })
  rate: number; // Tasa de venta

  @Column('decimal', { precision: 16, scale: 2 })
  totalPesos: number; // amount * rate

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  profit: number;

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  costBasis: number; // The cost of goods sold (COGS) at the moment of sale

  @Column({ default: 'cash' }) // cash, transfer, credit
  paymentType: string;

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  paidAmount: number; // Lo que pagó el cliente

  @Column('decimal', { precision: 16, scale: 2 })
  pendingBalance: number; // totalPesos - paidAmount

  @Column({ default: 'INVENTORY' }) // INVENTORY, DIRECT
  operationType: string;

  @Column({ default: 'completed' }) // completed, pending, reversed
  status: string;

  @Column({ nullable: true })
  reversedAt: Date;

  @Column({ nullable: true })
  reversedById: string;

  @Column({ nullable: true })
  reversalReason: string;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
