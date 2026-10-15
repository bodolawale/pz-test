import { Controller, Get } from '@nestjs/common';
import { User } from '@prisma/client';
import { AppService } from '../services/app.service.js';

@Controller('api/v1')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('users')
  getUsers(): Promise<User[]> {
    return this.appService.getUsers();
  }
}
