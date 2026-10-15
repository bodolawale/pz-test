import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository.js';

@Injectable()
export class AppService {
  constructor(private readonly userRepository: UserRepository) {}

  getHello(): string {
    return 'Hello World!';
  }

  getUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }
}
