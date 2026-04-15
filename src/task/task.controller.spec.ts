import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

describe('TaskController', () => {
  let controller: TaskController;
  let service: Record<string, jest.Mock>;
  const mockReq = { user: { id: 'user-1' } };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'task-1' }),
      findAll: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'task-1' }),
      remove: jest.fn().mockResolvedValue({ deleted: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [{ provide: TaskService, useValue: service }],
    }).compile();

    controller = module.get<TaskController>(TaskController);
  });

  it('create should pass user id and dto', async () => {
    const dto = { title: 'Task', boardId: 'board-1' };
    await controller.create(mockReq, dto as any);

    expect(service.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('findAll should pass boardId and user id', async () => {
    await controller.findAll(mockReq, 'board-1');

    expect(service.findAll).toHaveBeenCalledWith('board-1', 'user-1');
  });

  it('update should pass task id, user id and dto', async () => {
    const dto = { title: 'Updated' };
    await controller.update(mockReq, 'task-1', dto as any);

    expect(service.update).toHaveBeenCalledWith('task-1', 'user-1', dto);
  });

  it('remove should pass task id and user id', async () => {
    await controller.remove(mockReq, 'task-1');

    expect(service.remove).toHaveBeenCalledWith('task-1', 'user-1');
  });
});
