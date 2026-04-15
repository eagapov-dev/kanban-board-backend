import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: { user: any };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('search', () => {
    it('should search users by email/name excluding current user', async () => {
      const mockUsers = [
        { id: 'user-2', email: 'john@test.com', name: 'John' },
      ];
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.search('john', 'user-1');

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { not: 'user-1' },
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { name: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        select: { id: true, email: true, name: true },
        take: 10,
      });
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no results', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.search('nobody', 'user-1');

      expect(result).toEqual([]);
    });
  });
});
