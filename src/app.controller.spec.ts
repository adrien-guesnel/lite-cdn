import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Mock the package.json
jest.mock('@/package.json', () => ({
  version: '1.0.0',
}), { virtual: true });

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Lite CDN dev" in dev environment', () => {
      expect(appController.getVersion()).toBe('Lite CDN dev');
    });

    it('should return version string in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = appService.getVersion();

      expect(result).toContain('Lite CDN v');
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});

