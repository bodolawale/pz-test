import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './controllers/app.controller.js';
import { UserRepository } from './repositories/user.repository.js';
import { AppService } from './services/app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: UserRepository,
          useValue: {
            findAll: vi.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
