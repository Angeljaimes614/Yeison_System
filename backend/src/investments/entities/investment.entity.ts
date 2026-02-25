import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { InvestmentTransaction } from './investment-transaction.entity';

@Entity('investment_products') // Rename table to avoid conflict with old schema
export class Investment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // Ej: "Celular Samsung A54" (Antes 'concept')

  @Column({ default: 'General' })
  category: string; // Ej: "Celulares", "Billares"

  @Column('decimal', { precision: 16, scale: 2 })
  totalCost: number; // Costo Total de la Inversión (Sale de Caja)

  @Column('decimal', { precision: 16, scale: 2 })
  unitCost: number; // Costo por unidad (Calculado: totalCost / initialQuantity)

  @Column('int')
  initialQuantity: number; // Cantidad comprada

  @Column('int')
  currentQuantity: number; // Cantidad disponible (Stock)

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'SOLD_OUT'; // Si currentQuantity = 0 -> SOLD_OUT

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => InvestmentTransaction, (tx) => tx.investment)
  transactions: InvestmentTransaction[];

  @CreateDateColumn()
  date: Date;
}
