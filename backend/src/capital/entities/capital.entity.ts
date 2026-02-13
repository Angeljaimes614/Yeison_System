import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';

@Entity()
export class Capital {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  branchId: string;

  @OneToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  // El dinero base disponible para comprar divisas (e.g. Pesos)
  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  totalCapital: number;

  // El dinero asignado para operar en el día
  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  operativePlante: number;

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  accumulatedProfit: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
