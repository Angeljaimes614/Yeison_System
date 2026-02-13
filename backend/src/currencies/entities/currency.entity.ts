import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // USD, EUR, USDT, BS, ZELLE

  @Column()
  name: string; // Dolar Americano, Euro, Tether, Bolivar

  @Column({ default: 'fiat' }) // fiat, crypto, digital
  type: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
