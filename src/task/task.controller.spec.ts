import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TaskController', () => {
  let controller: TaskController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'task-1' }),
      findAll: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'task-1' }),
      remove: jest.fn().mockResolvedValue({ deleted: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: TaskService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
  });

  it('create should pass boardId and dto', async () => {
    const dto = { title: 'Task' };
    await controller.create('board-1', dto as any);
    expect(service.create).toHaveBeenCalledWith('board-1', dto);
  });

  it('findAll should pass boardId', async () => {
    await controller.findAll('board-1');
    expect(service.findAll).toHaveBeenCalledWith('board-1');
  });

  it('update should pass task id and dto', async () => {
    const dto = { title: 'Updated' };
    await controller.update('task-1', dto as any);
    expect(service.update).toHaveBeenCalledWith('task-1', dto);
  });

  it('remove should pass task id', async () => {
    await controller.remove('task-1');
    expect(service.remove).toHaveBeenCalledWith('task-1');
  });
});
