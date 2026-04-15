import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, currentUserId: string) {
    return this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true },
      take: 10,
    });
  }
}
