import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.products.findMany({
      include: {
        categories: true,
        product_sizes: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: bigint) {
    return this.prisma.products.findUnique({
      where: { id },
      include: {
        categories: true,
        product_sizes: true,
      },
    });
  }

  async create(data: {
    name: string;
    description?: string;
    category_id?: string;
  }) {
    return this.prisma.products.create({
      data: {
        name: data.name,
        description: data.description,
        category_id: data.category_id
          ? BigInt(data.category_id)
          : null,
      },
    });
  }

  async update(
    id: bigint,
    data: {
      name?: string;
      description?: string;
    },
  ) {
    return this.prisma.products.update({
      where: { id },
      data,
    });
  }

  async remove(id: bigint) {
    return this.prisma.products.delete({
      where: { id },
    });
  }
}