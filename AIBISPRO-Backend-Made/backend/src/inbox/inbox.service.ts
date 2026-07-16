import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AUTHOR_SELECT = {
  users_inbox_messages_author_idTousers: { select: { id: true, name: true, role: true } },
};

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { company_id: number; author_id: number; message: string; ai_generated?: boolean }) {
    return this.prisma.inbox_messages.create({
      data: {
        company_id: data.company_id,
        author_id: data.author_id,
        message: data.message,
        ai_generated: data.ai_generated ?? false,
      },
      include: AUTHOR_SELECT,
    });
  }

  async findForCompany(companyId: number) {
    return this.prisma.inbox_messages.findMany({
      where: { company_id: companyId, is_deleted: false },
      orderBy: { created_at: 'asc' },
      include: AUTHOR_SELECT,
    });
  }

  async findOne(id: number) {
    return this.prisma.inbox_messages.findUnique({ where: { id } });
  }

  async update(id: number, message: string) {
    return this.prisma.inbox_messages.update({
      where: { id },
      data: { message, is_edited: true },
      include: AUTHOR_SELECT,
    });
  }

  async softDelete(id: number) {
    return this.prisma.inbox_messages.update({
      where: { id },
      data: { is_deleted: true },
    });
  }

  async markThreadRead(companyId: number, currentUserId: number) {
    return this.prisma.inbox_messages.updateMany({
      where: { company_id: companyId, author_id: { not: currentUserId }, is_read: false, is_deleted: false },
      data: { is_read: true },
    });
  }

  async countUnread(companyId: number, currentUserId: number) {
    return this.prisma.inbox_messages.count({
      where: { company_id: companyId, author_id: { not: currentUserId }, is_read: false, is_deleted: false },
    });
  }
}
