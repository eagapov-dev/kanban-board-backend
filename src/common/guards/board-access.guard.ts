import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BoardAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    const boardId = req.params.boardId || req.params.id;

    if (!userId || !boardId) return false;

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

    req.board = board;
    return true;
  }
}
