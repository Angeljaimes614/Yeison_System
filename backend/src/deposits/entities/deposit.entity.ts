import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('deposits')
export class Deposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 4 })
  multiplier: number;

  @Column('decimal', { precision: 15, scale: 2 })
  total: number;

  @Column()
  description: string;

  @Column({ default: false })
  isReversed: boolean;

  @Column({ nullable: true })
  createdById: string;
}