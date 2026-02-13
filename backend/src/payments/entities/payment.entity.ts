import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  date: Date;

  @Column('decimal', { precision: 16, scale: 2 })
  amount: number;

  @Column({ default: 'cash' })
  method: string; // cash, transfer

  @Column({ nullable: true })
  purchaseId: string;

  @ManyToOne(() => Purchase, { nullable: true })
  @JoinColumn({ name: 'purchaseId' })
  purchase: Purchase;

  @Column({ nullable: true })
  saleId: string;

  @ManyToOne(() => Sale, { nullable: true })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

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
