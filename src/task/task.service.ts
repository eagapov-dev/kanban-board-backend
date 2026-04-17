import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async create(boardId: string, dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        boardId,
      },
    });

    this.boardGateway.emitTaskCreated(boardId, task);
    return task;
  }

  findAll(boardId: string) {
    return this.prisma.task.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

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

  async remove(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.task.delete({ where: { id } });

    this.boardGateway.emitTaskDeleted(task.boardId, id);
    return { deleted: true };
  }
}
