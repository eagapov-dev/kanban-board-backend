import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from './board.gateway';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardService {
  constructor(
    private prisma: PrismaService,
    private boardGateway: BoardGateway,
  ) {}

  create(userId: string, dto: CreateBoardDto) {
    return this.prisma.board.create({
      data: {
        name: dto.name,
        userId,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.board.findMany({
      where: {
        OR: [
          { userId },
          { subscribedUsers: { some: { id: userId } } },
        ],
      },
      include: {
        tasks: true,
        owner: { select: { id: true, email: true, name: true } },
        subscribedUsers: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const board = await this.prisma.board.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { subscribedUsers: { some: { id: userId } } },
        ],
      },
      include: {
        tasks: { orderBy: { createdAt: 'asc' } },
        owner: { select: { id: true, email: true, name: true } },
        subscribedUsers: { select: { id: true, email: true, name: true } },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return board;
  }

  async update(id: string, userId: string, dto: UpdateBoardDto) {
    const board = await this.prisma.board.findUnique({ where: { id } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.userId !== userId) throw new ForbiddenException('Only the owner can update this board');

    return this.prisma.board.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(id: string, userId: string) {
    const board = await this.prisma.board.findUnique({ where: { id } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.userId !== userId) throw new ForbiddenException('Only the owner can delete this board');

    return this.prisma.board.delete({ where: { id } });
  }

  async invite(boardId: string, ownerId: string, userId: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.userId !== ownerId) {
      throw new ForbiddenException('Only the owner can invite users');
    }

    const result = await this.prisma.board.update({
      where: { id: boardId },
      data: {
        subscribedUsers: { connect: { id: userId } },
      },
      include: {
        subscribedUsers: { select: { id: true, email: true, name: true } },
      },
    });

    this.boardGateway.emitBoardInvited(userId);
    return result;
  }

  async kick(boardId: string, ownerId: string, userId: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.userId !== ownerId) {
      throw new ForbiddenException('Only the owner can remove users');
    }

    const result = await this.prisma.board.update({
      where: { id: boardId },
      data: {
        subscribedUsers: { disconnect: { id: userId } },
      },
      include: {
        subscribedUsers: { select: { id: true, email: true, name: true } },
      },
    });

    this.boardGateway.emitBoardKicked(userId, boardId);
    return result;
  }
}
