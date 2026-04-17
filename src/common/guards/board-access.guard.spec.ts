import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { BoardAccessGuard } from './board-access.guard';

describe('BoardAccessGuard', () => {
  let guard: BoardAccessGuard;
  let prisma: { board: { findFirst: jest.Mock } };

  function createContext(params: any, user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ params, user }),
      }),
    } as any;
  }

  beforeEach(() => {
    prisma = { board: { findFirst: jest.fn() } };
    guard = new BoardAccessGuard(prisma as any);
  });

  it('should allow access when user is owner or subscriber', async () => {
    prisma.board.findFirst.mockResolvedValue({ id: 'board-1', userId: 'user-1' });

    const result = await guard.canActivate(createContext({ boardId: 'board-1' }, { id: 'user-1' }));

    expect(result).toBe(true);
  });

  it('should also work with params.id', async () => {
    prisma.board.findFirst.mockResolvedValue({ id: 'board-1' });

    const result = await guard.canActivate(createContext({ id: 'board-1' }, { id: 'user-1' }));

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when no access', async () => {
    prisma.board.findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext({ boardId: 'board-1' }, { id: 'stranger' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return false when no user', async () => {
    const result = await guard.canActivate(createContext({ boardId: 'board-1' }, null));

    expect(result).toBe(false);
  });
});
