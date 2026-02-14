import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Currency } from '../../currencies/entities/currency.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Purchase {
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
  providerId: string;

  @ManyToOne(() => Provider, { nullable: true })
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column({ nullable: true })
  providerName: string;

  @Column()
  currencyId: string;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;

  @Column('decimal', { precision: 16, scale: 2 })
  amount: number; // Monto en moneda extranjera

  @Column('decimal', { precision: 16, scale: 2 })
  rate: number; // Tasa de compra

  @Column('decimal', { precision: 16, scale: 2 })
  totalPesos: number; // amount * rate

  @Column({ default: 'cash' }) // cash, transfer, credit
  paymentType: string;

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  paidAmount: number; // Lo que se pagó al momento (abonos)

  @Column('decimal', { precision: 16, scale: 2 })
  pendingBalance: number; // totalPesos - paidAmount

  @Column({ default: 'completed' }) // completed, pending (if pendingBalance > 0)
  status: string;

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
