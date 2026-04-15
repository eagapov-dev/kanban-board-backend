import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      register: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
      login: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
      refresh: jest.fn().mockResolvedValue({ accessToken: 'at2', refreshToken: 'rt2' }),
      logout: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('register should call service.register with dto', async () => {
    const dto = { email: 'a@b.com', password: '123456', name: 'Test' };
    const result = await controller.register(dto);

    expect(service.register).toHaveBeenCalledWith(dto);
    expect(result).toHaveProperty('accessToken');
  });

  it('login should call service.login with dto', async () => {
    const dto = { email: 'a@b.com', password: '123456' };
    const result = await controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result).toHaveProperty('accessToken');
  });

  it('refresh should call service.refresh with token', async () => {
    await controller.refresh('rt');

    expect(service.refresh).toHaveBeenCalledWith('rt');
  });

  it('logout should call service.logout with token', async () => {
    await controller.logout('rt');

    expect(service.logout).toHaveBeenCalledWith('rt');
  });
});
