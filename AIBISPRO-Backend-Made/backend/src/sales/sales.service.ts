import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: number) {
    return this.prisma.sales.findMany({
      where: companyId ? { company_id: companyId } : undefined,
      include: {
        sale_items: true,
      },
      orderBy: {
        transaction_date: "desc",
      },
      take: 20,
    });
  }

  async findOne(id: number) {
    return this.prisma.sales.findUnique({
      where: { id },
      include: {
        sale_items: true,
      },
    });
  }

  async create(data: {
    product_size_id: number;
    quantity: number;
    payment_method: string;
  }) {
    try {
      const productSize = await this.prisma.product_sizes.findUnique({
        where: {
          id: Number(data.product_size_id),
        },
        include: { products: true },
      });

      if (!productSize) {
        throw new Error("Product size not found");
      }

      const total = Number(productSize.selling_price) * data.quantity;

      const sale = await this.prisma.sales.create({
        data: {
          transaction_date: new Date(),
          total_amount: total,
          payment_method: data.payment_method,
          total_items: data.quantity,
          company_id: productSize.products?.company_id,
        },
      });

      await this.prisma.sale_items.create({
        data: {
          sale_id: sale.id,
          product_id: productSize.product_id,
          product_size_id: productSize.id,
          quantity: data.quantity,
          unit_price: productSize.selling_price,
          subtotal: total,
        },
      });

      await this.prisma.product_sizes.update({
        where: {
          id: productSize.id,
        },
        data: {
          current_stock: (productSize.current_stock ?? 0) - data.quantity,
        },
      });

      return {
        id: sale.id,
        transaction_date: sale.transaction_date,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        total_items: sale.total_items,
      };
    } catch (error) {
      console.error("SALES ERROR:", error);
      throw error;
    }
  }
}
