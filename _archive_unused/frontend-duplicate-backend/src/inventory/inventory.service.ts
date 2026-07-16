import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product_sizes.findMany({
      include: {
        products: true,
      },
      orderBy: {
        current_stock: 'asc',
      },
    });
  }

  async stockIn(data: {
    product_size_id: number;
    quantity: number;
    notes?: string;
  }) {
    const productSize =
      await this.prisma.product_sizes.findUnique({
        where: {
          id: BigInt(data.product_size_id),
        },
      });

    if (!productSize) {
      throw new Error('Product size not found');
    }

    const updated =
      await this.prisma.product_sizes.update({
        where: {
          id: productSize.id,
        },
        data: {
          current_stock:
            (productSize.current_stock ?? 0) +
            data.quantity,
        },
      });

    await this.prisma.inventory_logs.create({
      data: {
        product_size_id: productSize.id,
        movement_type: 'IN',
        quantity: data.quantity,
        notes: data.notes,
      },
    });

    return updated;
  }
}