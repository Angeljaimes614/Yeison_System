import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class CashAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  date: Date;

  @Column()
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column('decimal', { precision: 16, scale: 2 })
  systemBalance: number; // Saldo esperado por el sistema

  @Column('decimal', { precision: 16, scale: 2 })
  physicalBalance: number; // Efectivo real contado en caja

  @Column('decimal', { precision: 16, scale: 2 })
  difference: number; // physicalBalance - systemBalance

  @Column({ nullable: true })
  observations: string;

  @Column({ default: 'pending' }) // pending, approved
  status: string;

  @Column()
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
