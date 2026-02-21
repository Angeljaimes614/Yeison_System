import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class CapitalMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // INJECTION, WITHDRAWAL_PROFIT, WITHDRAWAL_CAPITAL

  @Column('decimal', { precision: 16, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  date: Date;
}
