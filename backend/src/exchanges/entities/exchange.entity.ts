import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Currency } from '../../currencies/entities/currency.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Exchange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sourceCurrencyId: string;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'sourceCurrencyId' })
  sourceCurrency: Currency;

  @Column()
  targetCurrencyId: string;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'targetCurrencyId' })
  targetCurrency: Currency;

  @Column('decimal', { precision: 16, scale: 2 })
  sourceAmount: number;

  @Column('decimal', { precision: 16, scale: 2 })
  targetAmount: number;

  @Column('decimal', { precision: 16, scale: 8 })
  exchangeRate: number; // Target / Source

  @Column('decimal', { precision: 16, scale: 2 })
  costTransferredCOP: number;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  date: Date;
}
