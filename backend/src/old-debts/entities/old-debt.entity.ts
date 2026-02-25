import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class OldDebt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientName: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 16, scale: 2 })
  totalAmount: number; // Monto Inicial

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  paidAmount: number; // Abonos acumulados

  @Column('decimal', { precision: 16, scale: 2 })
  pendingBalance: number; // Saldo Pendiente

  @Column({ default: true })
  isActive: boolean; // Si pendingBalance > 0

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
