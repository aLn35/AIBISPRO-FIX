import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll(companyId?: number) {
    return this.prisma.promotions.findMany({
      where: companyId ? { company_id: companyId } : undefined,
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: number) {
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
    company_id: number;
    created_by?: number;
  }) {
    return this.prisma.promotions.create({
      data: {
        title: data.title,
        description: data.description,
        discount_percent:
          data.discount_percent,
        start_date: data.start_date
          ? new Date(data.start_date)
          : null,
        end_date: data.end_date
          ? new Date(data.end_date)
          : null,
        status: data.status ?? 'pending',
        company_id: data.company_id,
        created_by: data.created_by,
      },
    });
  }

  async update(
    id: number,
    data: {
      title?: string;
      description?: string;
      discount_percent?: number;
      status?: string;
      approved_by?: number;
    },
  ) {
    return this.prisma.promotions.update({
      where: {
        id,
      },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.promotions.delete({
      where: {
        id,
      },
    });
  }
}
