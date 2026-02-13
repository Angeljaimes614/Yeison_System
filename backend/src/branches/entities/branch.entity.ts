import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., "Casa Principal", "Caracas"

  @Column({ nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.branch)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
