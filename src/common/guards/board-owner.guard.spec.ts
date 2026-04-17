import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BoardOwnerGuard } from './board-owner.guard';

describe('BoardOwnerGuard', () => {
  let guard: BoardOwnerGuard;
  let prisma: { board: { findUnique: jest.Mock } };

  function createContext(params: any, user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ params, user }),
      }),
    } as any;
  }

  beforeEach(() => {
    prisma = { board: { findUnique: jest.fn() } };
    guard = new BoardOwnerGuard(prisma as any);
  });

  it('should allow access when user is owner', async () => {
    prisma.board.findUnique.mockResolvedValue({ id: 'board-1', userId: 'owner-1' });

    const result = await guard.canActivate(createContext({ id: 'board-1' }, { id: 'owner-1' }));

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when not owner', async () => {
    prisma.board.findUnique.mockResolvedValue({ id: 'board-1', userId: 'owner-1' });

    await expect(
      guard.canActivate(createContext({ id: 'board-1' }, { id: 'not-owner' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException when board not found', async () => {
    prisma.board.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext({ id: 'not-found' }, { id: 'user-1' })),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return false when no user', async () => {
    const result = await guard.canActivate(createContext({ id: 'board-1' }, null));

    expect(result).toBe(false);
  });
});
