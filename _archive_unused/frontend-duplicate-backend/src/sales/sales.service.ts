import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    const sales = await this.prisma.sales.findMany({
      include: {
        sale_items: true,
      },
      orderBy: {
        transaction_date: 'desc',
      },
      take: 20,
    });

    return JSON.parse(
      JSON.stringify(
        sales,
        (_, value) =>
          typeof value === 'bigint'
            ? value.toString()
            : value,
      ),
    );
  }

  async findOne(id: bigint) {
    const sale = await this.prisma.sales.findUnique({
      where: { id },
      include: {
        sale_items: true,
      },
    });

    return JSON.parse(
      JSON.stringify(
        sale,
        (_, value) =>
          typeof value === 'bigint'
            ? value.toString()
            : value,
      ),
    );
  }

  async create(data: {
    product_size_id: number;
    quantity: number;
    payment_method: string;
  }) {
    try {
      const productSize =
        await this.prisma.product_sizes.findUnique({
          where: {
            id: BigInt(data.product_size_id),
          },
        });

      if (!productSize) {
        throw new Error(
          'Product size not found',
        );
      }

      const total =
        Number(productSize.selling_price) *
        data.quantity;

      const sale =
        await this.prisma.sales.create({
          data: {
            transaction_date: new Date(),
            total_amount: total.toString(),
            payment_method:
              data.payment_method,
            total_items: data.quantity,
          },
        });

      await this.prisma.sale_items.create({
        data: {
          sale_id: sale.id,
          product_id: productSize.product_id,
          product_size_id:
            productSize.id,
          quantity: data.quantity,
          unit_price:
            productSize.selling_price,
          subtotal: total.toString(),
        },
      });

      await this.prisma.product_sizes.update({
        where: {
          id: productSize.id,
        },
        data: {
          current_stock:
            (productSize.current_stock ?? 0) -
            data.quantity,
        },
      });

      return {
        id: sale.id.toString(),
        transaction_date:
          sale.transaction_date,
        total_amount: sale.total_amount,
        payment_method:
          sale.payment_method,
        total_items: sale.total_items,
      };
    } catch (error) {
      console.error(
        'SALES ERROR:',
        error,
      );
      throw error;
    }
  }
}