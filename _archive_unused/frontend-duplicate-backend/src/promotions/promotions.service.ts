import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    return this.prisma.promotions.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: bigint) {
    return this.prisma.promotions.findUnique({
      where: {
        id,
      },
    });
  }

  async create(data: {
    title: string;
    description?: string;
    discount_percent?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }) {
    return this.prisma.promotions.create({
      data: {
        title: data.title,
        description: data.description,
        discount_percent:
          data.discount_percent?.toString(),
        start_date: data.start_date
          ? new Date(data.start_date)
          : null,
        end_date: data.end_date
          ? new Date(data.end_date)
          : null,
        status: data.status ?? 'active',
      },
    });
  }

  async update(
    id: bigint,
    data: {
      title?: string;
      description?: string;
      discount_percent?: number;
      status?: string;
    },
  ) {
    return this.prisma.promotions.update({
      where: {
        id,
      },
      data: {
        ...data,
        discount_percent:
          data.discount_percent !== undefined
            ? data.discount_percent.toString()
            : undefined,
      },
    });
  }

  async remove(id: bigint) {
    return this.prisma.promotions.delete({
      where: {
        id,
      },
    });
  }
}