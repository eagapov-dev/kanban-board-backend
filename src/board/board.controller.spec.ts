import { Test, TestingModule } from '@nestjs/testing';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';

describe('BoardController', () => {
  let controller: BoardController;
  let service: Record<string, jest.Mock>;
  const mockReq = { user: { id: 'user-1' } };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'board-1', name: 'Board' }),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'board-1' }),
      update: jest.fn().mockResolvedValue({ id: 'board-1', name: 'Updated' }),
      remove: jest.fn().mockResolvedValue({ id: 'board-1' }),
      invite: jest.fn().mockResolvedValue({}),
      kick: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardController],
      providers: [{ provide: BoardService, useValue: service }],
    }).compile();

    controller = module.get<BoardController>(BoardController);
  });

  it('create should pass user id and dto to service', async () => {
    await controller.create(mockReq, { name: 'Board' });

    expect(service.create).toHaveBeenCalledWith('user-1', { name: 'Board' });
  });

  it('findAll should pass user id to service', async () => {
    await controller.findAll(mockReq);

    expect(service.findAll).toHaveBeenCalledWith('user-1');
  });

  it('findOne should pass board id and user id', async () => {
    await controller.findOne(mockReq, 'board-1');

    expect(service.findOne).toHaveBeenCalledWith('board-1', 'user-1');
  });

  it('update should pass board id, user id and dto', async () => {
    await controller.update(mockReq, 'board-1', { name: 'Updated' });

    expect(service.update).toHaveBeenCalledWith('board-1', 'user-1', { name: 'Updated' });
  });

  it('remove should pass board id and user id', async () => {
    await controller.remove(mockReq, 'board-1');

    expect(service.remove).toHaveBeenCalledWith('board-1', 'user-1');
  });

  it('invite should pass board id, owner id and target user id', async () => {
    await controller.invite(mockReq, 'board-1', 'user-2');

    expect(service.invite).toHaveBeenCalledWith('board-1', 'user-1', 'user-2');
  });

  it('kick should pass board id, owner id and target user id', async () => {
    await controller.kick(mockReq, 'board-1', 'user-2');

    expect(service.kick).toHaveBeenCalledWith('board-1', 'user-1', 'user-2');
  });
});
