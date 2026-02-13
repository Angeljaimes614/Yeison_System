import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      ...userData,
      passwordHash,
    });
    
    return this.userRepository.save(user);
  }

  findAll() {
    return this.userRepository.find({ relations: ['branch'] });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['branch'] });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByUsername(username: string) {
    return this.userRepository.findOne({ where: { username } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (updateUserDto.password) {
        const salt = await bcrypt.genSalt();
        user.passwordHash = await bcrypt.hash(updateUserDto.password, salt);
    }
    
    // Remove password from dto to avoid overwriting with plain text if it exists there (it shouldn't but safe guard)
    // Actually, UpdateUserDto extends CreateUserDto which has 'password'. 
    // We should handle other fields manually or use spread carefully.
    
    if (updateUserDto.username) user.username = updateUserDto.username;
    if (updateUserDto.fullName) user.fullName = updateUserDto.fullName;
    if (updateUserDto.role) user.role = updateUserDto.role;
    if (updateUserDto.branchId) user.branchId = updateUserDto.branchId;

    return this.userRepository.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    return this.userRepository.remove(user);
  }
}
