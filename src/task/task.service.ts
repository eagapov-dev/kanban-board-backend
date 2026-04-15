import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../board/board.gateway';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private boardGateway: BoardGateway,
  ) {}

  async create(userId: string, dto: CreateTaskDto) {
    await this.verifyBoardAccess(dto.boardId, userId);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        boardId: dto.boardId,
      },
    });

    this.boardGateway.emitTaskCreated(dto.boardId, task);
    return task;
  }

  async findAll(boardId: string, userId: string) {
    await this.verifyBoardAccess(boardId, userId);

    return this.prisma.task.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.verifyBoardAccess(task.boardId, userId);

    // Optimistic locking
    if (dto.updatedAt) {
      const clientUpdatedAt = new Date(dto.updatedAt);
      if (task.updatedAt.getTime() !== clientUpdatedAt.getTime()) {
        throw new ConflictException('Task was modified by another user');
      }
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        status: dto.status,
      },
    });

    this.boardGateway.emitTaskUpdated(task.boardId, updated);
    return updated;
  }

  async remove(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.verifyBoardAccess(task.boardId, userId);

    await this.prisma.task.delete({ where: { id } });

    this.boardGateway.emitTaskDeleted(task.boardId, id);
    return { deleted: true };
  }

  private async verifyBoardAccess(boardId: string, userId: string) {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { userId },
          { subscribedUsers: { some: { id: userId } } },
        ],
      },
    });

    if (!board) {
      throw new ForbiddenException('No access to this board');
    }
  }
}
