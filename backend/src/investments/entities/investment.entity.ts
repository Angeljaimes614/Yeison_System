import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Investment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: 'INVERSION' | 'RETORNO'; // INVERSION = Salida de Caja, RETORNO = Entrada a Caja

  @Column()
  concept: string; // Ej: "Compra de 5 Celulares", "Venta Taco Billar"

  @Column('decimal', { precision: 16, scale: 2 })
  amount: number; // Monto total que entra o sale

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  profit: number; // Solo para RETORNO. Cuánto de ese monto es ganancia neta.

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  date: Date;
}
