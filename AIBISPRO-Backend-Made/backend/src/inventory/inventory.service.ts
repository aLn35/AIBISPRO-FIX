import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: number) {
    return this.prisma.product_sizes.findMany({
      where: companyId ? { products: { company_id: companyId } } : undefined,
      include: {
        products: true,
      },
      orderBy: {
        current_stock: 'asc',
      },
    });
  }

  async findOneWithCompany(id: number) {
    return this.prisma.product_sizes.findUnique({
      where: { id },
      include: { products: { select: { company_id: true } } },
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
          id: Number(data.product_size_id),
        },
      });

    if (!productSize) {
      throw new NotFoundException('Product size not found');
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

  /** Direct edit of a menu item's size/price/cost/stock levels (not an increment like stockIn). */
  async update(
    id: number,
    data: {
      size_name?: string;
      selling_price?: number;
      cost_price?: number;
      current_stock?: number;
      minimum_stock?: number;
    },
  ) {
    return this.prisma.product_sizes.update({
      where: { id },
      data: {
        ...(data.size_name !== undefined ? { size_name: data.size_name } : {}),
        ...(data.selling_price !== undefined ? { selling_price: data.selling_price } : {}),
        ...(data.cost_price !== undefined ? { cost_price: data.cost_price } : {}),
        ...(data.current_stock !== undefined ? { current_stock: data.current_stock } : {}),
        ...(data.minimum_stock !== undefined ? { minimum_stock: data.minimum_stock } : {}),
      },
    });
  }
}
