import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BoardService } from './board.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from './board.gateway';

describe('BoardService', () => {
  let service: BoardService;
  let prisma: { board: any };
  let gateway: { emitBoardInvited: jest.Mock; emitBoardKicked: jest.Mock };

  const mockBoard = {
    id: 'board-1',
    name: 'Test Board',
    userId: 'owner-1',
    tasks: [],
    owner: { id: 'owner-1', email: 'owner@test.com', name: 'Owner' },
    subscribedUsers: [],
  };

  beforeEach(async () => {
    prisma = {
      board: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    gateway = {
      emitBoardInvited: jest.fn(),
      emitBoardKicked: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
        { provide: PrismaService, useValue: prisma },
        { provide: BoardGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<BoardService>(BoardService);
  });

  describe('create', () => {
    it('should create a board with userId', async () => {
      prisma.board.create.mockResolvedValue(mockBoard);

      const result = await service.create('owner-1', { name: 'Test Board' });

      expect(prisma.board.create).toHaveBeenCalledWith({
        data: { name: 'Test Board', userId: 'owner-1' },
      });
      expect(result).toEqual(mockBoard);
    });
  });

  describe('findAll', () => {
    it('should return boards for user (owned + subscribed)', async () => {
      prisma.board.findMany.mockResolvedValue([mockBoard]);

      const result = await service.findAll('owner-1');

      expect(prisma.board.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { userId: 'owner-1' },
              { subscribedUsers: { some: { id: 'owner-1' } } },
            ],
          },
        }),
      );
      expect(result).toEqual([mockBoard]);
    });
  });

  describe('findOne', () => {
    it('should return board with tasks', async () => {
      prisma.board.findFirst.mockResolvedValue(mockBoard);

      const result = await service.findOne('board-1', 'owner-1');

      expect(result).toEqual(mockBoard);
    });

    it('should throw NotFoundException if board not found', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(service.findOne('not-found', 'owner-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update board name when owner', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.board.update.mockResolvedValue({ ...mockBoard, name: 'Updated' });

      const result = await service.update('board-1', 'owner-1', { name: 'Updated' });

      expect(prisma.board.update).toHaveBeenCalledWith({
        where: { id: 'board-1' },
        data: { name: 'Updated' },
      });
      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenException if not owner', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);

      await expect(service.update('board-1', 'not-owner', { name: 'x' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if board not found', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.update('not-found', 'owner-1', { name: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete board when owner', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.board.delete.mockResolvedValue(mockBoard);

      await service.remove('board-1', 'owner-1');

      expect(prisma.board.delete).toHaveBeenCalledWith({ where: { id: 'board-1' } });
    });

    it('should throw ForbiddenException if not owner', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);

      await expect(service.remove('board-1', 'not-owner')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if board not found', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.remove('not-found', 'owner-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('invite', () => {
    it('should add user to subscribedUsers', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.board.update.mockResolvedValue({ ...mockBoard, subscribedUsers: [{ id: 'user-2' }] });

      await service.invite('board-1', 'owner-1', 'user-2');

      expect(prisma.board.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { subscribedUsers: { connect: { id: 'user-2' } } },
        }),
      );
      expect(gateway.emitBoardInvited).toHaveBeenCalledWith('user-2');
    });

    it('should throw ForbiddenException if not owner', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);

      await expect(service.invite('board-1', 'not-owner', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if board not found', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(service.invite('not-found', 'owner-1', 'user-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('kick', () => {
    it('should remove user from subscribedUsers', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.board.update.mockResolvedValue({ ...mockBoard, subscribedUsers: [] });

      await service.kick('board-1', 'owner-1', 'user-2');

      expect(prisma.board.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { subscribedUsers: { disconnect: { id: 'user-2' } } },
        }),
      );
      expect(gateway.emitBoardKicked).toHaveBeenCalledWith('user-2', 'board-1');
    });

    it('should throw ForbiddenException if not owner', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);

      await expect(service.kick('board-1', 'not-owner', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });
});
