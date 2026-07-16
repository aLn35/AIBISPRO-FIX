import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(companyId?: number) {
    const totalProducts = await this.prisma.products.count({
      where: companyId ? { company_id: companyId } : undefined,
    });

    const totalTransactions = await this.prisma.sales.count({
      where: companyId ? { company_id: companyId } : undefined,
    });

    const revenue = await this.prisma.sales.aggregate({
      where: companyId ? { company_id: companyId } : undefined,
      _sum: {
        total_amount: true,
      },
    });

    const activePromotions = await this.prisma.promotions.count({
      where: {
        status: 'active',
        ...(companyId ? { company_id: companyId } : {}),
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
