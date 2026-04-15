import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { TaskService } from './task.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../board/board.gateway';

describe('TaskService', () => {
  let service: TaskService;
  let prisma: { task: any; board: any };
  let gateway: { emitTaskCreated: jest.Mock; emitTaskUpdated: jest.Mock; emitTaskDeleted: jest.Mock };

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'desc',
    priority: 'MEDIUM',
    status: 'PENDING',
    boardId: 'board-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
  };

  const mockBoard = { id: 'board-1', userId: 'owner-1' };

  beforeEach(async () => {
    prisma = {
      task: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      board: {
        findFirst: jest.fn(),
      },
    };

    gateway = {
      emitTaskCreated: jest.fn(),
      emitTaskUpdated: jest.fn(),
      emitTaskDeleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: prisma },
        { provide: BoardGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  describe('create', () => {
    it('should create task and emit event', async () => {
      prisma.board.findFirst.mockResolvedValue(mockBoard);
      prisma.task.create.mockResolvedValue(mockTask);

      const result = await service.create('owner-1', {
        title: 'Test Task',
        boardId: 'board-1',
      });

      expect(prisma.task.create).toHaveBeenCalled();
      expect(gateway.emitTaskCreated).toHaveBeenCalledWith('board-1', mockTask);
      expect(result).toEqual(mockTask);
    });

    it('should throw ForbiddenException if no board access', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(
        service.create('stranger', { title: 'Test', boardId: 'board-1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return tasks for board', async () => {
      prisma.board.findFirst.mockResolvedValue(mockBoard);
      prisma.task.findMany.mockResolvedValue([mockTask]);

      const result = await service.findAll('board-1', 'owner-1');

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual([mockTask]);
    });
  });

  describe('update', () => {
    it('should update task and emit event', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.board.findFirst.mockResolvedValue(mockBoard);
      const updated = { ...mockTask, title: 'Updated' };
      prisma.task.update.mockResolvedValue(updated);

      const result = await service.update('task-1', 'owner-1', { title: 'Updated' });

      expect(gateway.emitTaskUpdated).toHaveBeenCalledWith('board-1', updated);
      expect(result.title).toBe('Updated');
    });

    it('should throw NotFoundException if task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(
        service.update('not-found', 'owner-1', { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on optimistic locking conflict', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.board.findFirst.mockResolvedValue(mockBoard);

      await expect(
        service.update('task-1', 'owner-1', {
          title: 'x',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not throw ConflictException when updatedAt matches', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.board.findFirst.mockResolvedValue(mockBoard);
      prisma.task.update.mockResolvedValue(mockTask);

      await expect(
        service.update('task-1', 'owner-1', {
          title: 'x',
          updatedAt: '2026-01-01T12:00:00.000Z',
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete task and emit event', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.board.findFirst.mockResolvedValue(mockBoard);
      prisma.task.delete.mockResolvedValue(mockTask);

      const result = await service.remove('task-1', 'owner-1');

      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
      expect(gateway.emitTaskDeleted).toHaveBeenCalledWith('board-1', 'task-1');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException if task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.remove('not-found', 'owner-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if no board access', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(service.remove('task-1', 'stranger')).rejects.toThrow(ForbiddenException);
    });
  });
});
