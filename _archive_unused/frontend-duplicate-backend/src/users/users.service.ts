import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    return this.prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        last_login: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: bigint) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        last_login: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return user;
  }

  async updateRole(
    id: bigint,
    role: string,
  ) {
    return this.prisma.users.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async remove(id: bigint) {
    return this.prisma.users.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }
}