import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: Record<string, jest.Mock>;
  const mockReq = { user: { id: 'user-1' } };

  beforeEach(async () => {
    service = {
      search: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: service }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('search should pass query and user id', async () => {
    await controller.search(mockReq, 'john');

    expect(service.search).toHaveBeenCalledWith('john', 'user-1');
  });

  it('search should default to empty string when query is undefined', async () => {
    await controller.search(mockReq, undefined as any);

    expect(service.search).toHaveBeenCalledWith('', 'user-1');
  });
});
