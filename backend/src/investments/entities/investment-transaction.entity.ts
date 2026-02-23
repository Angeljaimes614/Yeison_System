import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Investment } from './investment.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class InvestmentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  investmentId: string;

  @ManyToOne(() => Investment, (inv) => inv.transactions)
  @JoinColumn({ name: 'investmentId' })
  investment: Investment;

  @Column('int')
  quantity: number; // Cantidad vendida (Ej: 1)

  @Column('decimal', { precision: 16, scale: 2 })
  salePrice: number; // Precio de Venta Total (Ej: 700.000)

  @Column('decimal', { precision: 16, scale: 2 })
  profit: number; // Utilidad generada (Ej: 200.000)

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  date: Date;
}
