import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTopProducts() {
    const result = await this.prisma.sale_items.groupBy({
      by: ['product_id'],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    const products = await Promise.all(
      result.map(async (item) => {
        const product = await this.prisma.products.findUnique({
          where: {
            id: item.product_id!,
          },
        });

        return {
          name: product?.name,
          totalSold: item._sum.quantity,
        };
      }),
    );

    return products;
  }

  async getRevenueSummary() {
    const sales = await this.prisma.sales.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        total_amount: true,
      },
      _avg: {
        total_amount: true,
      },
    });

    return {
      totalTransactions: sales._count.id,
      totalRevenue: sales._sum.total_amount ?? 0,
      averageOrderValue: sales._avg.total_amount ?? 0,
    };
  }

  async getLowStock() {
    const lowStockItems =
      await this.prisma.product_sizes.findMany({
        where: {
          current_stock: {
            lte: 10,
          },
        },
        include: {
          products: true,
        },
        orderBy: {
          current_stock: 'asc',
        },
      });

    return lowStockItems.map((item) => ({
      product: item.products.name,
      size: item.size_name,
      stock: item.current_stock,
      minimumStock: item.minimum_stock,
    }));
  }
}