import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';

export enum UserRole {
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  CASHIER = 'cajero',
  INVESTOR = 'inversionista',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CASHIER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, (branch) => branch.users, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
