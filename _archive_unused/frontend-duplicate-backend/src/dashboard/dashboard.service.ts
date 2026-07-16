import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const totalProducts = await this.prisma.products.count();

    const totalTransactions = await this.prisma.sales.count();

    const revenue = await this.prisma.sales.aggregate({
      _sum: {
        total_amount: true,
      },
    });

    const activePromotions = await this.prisma.promotions.count({
      where: {
        status: 'active',
      },
    });

    return {
      totalProducts,
      totalTransactions,
      totalRevenue: Number(revenue._sum.total_amount ?? 0),
      activePromotions,
    };
  }
}
