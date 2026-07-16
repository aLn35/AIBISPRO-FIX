import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: number) {
    return this.prisma.products.findMany({
      where: { is_active: true, ...(companyId ? { company_id: companyId } : {}) },
      include: {
        categories: true,
        product_sizes: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.products.findUnique({
      where: { id },
      include: {
        categories: true,
        product_sizes: true,
      },
    });
  }

  /** Finds a category by name for this company, creating it if it doesn't exist yet. */
  private async resolveCategoryId(companyId: number, categoryName?: string): Promise<number | undefined> {
    if (!categoryName) return undefined;
    const existing = await this.prisma.categories.findFirst({ where: { company_id: companyId, name: categoryName } });
    if (existing) return existing.id;
    const created = await this.prisma.categories.create({ data: { name: categoryName, company_id: companyId } });
    return created.id;
  }

  /** Creates a product, optionally with its first size in the same call (used by the Add Menu Item form). */
  async create(data: {
    name: string;
    description?: string;
    category_id?: string;
    category_name?: string;
    company_id: number;
    size_name?: string;
    selling_price?: number;
    cost_price?: number;
    current_stock?: number;
    minimum_stock?: number;
  }) {
    const categoryId = data.category_id
      ? Number(data.category_id)
      : await this.resolveCategoryId(data.company_id, data.category_name);

    return this.prisma.products.create({
      data: {
        name: data.name,
        description: data.description,
        category_id: categoryId ?? null,
        company_id: data.company_id,
        ...(data.size_name
          ? {
              product_sizes: {
                create: {
                  size_name: data.size_name,
                  selling_price: data.selling_price ?? 0,
                  cost_price: data.cost_price,
                  current_stock: data.current_stock ?? 0,
                  minimum_stock: data.minimum_stock ?? 10,
                },
              },
            }
          : {}),
      },
      include: { product_sizes: true, categories: true },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      category_id?: string;
      category_name?: string;
    },
  ) {
    let categoryId: number | undefined;
    if (data.category_id !== undefined) {
      categoryId = Number(data.category_id);
    } else if (data.category_name !== undefined) {
      const existing = await this.prisma.products.findUnique({ where: { id }, select: { company_id: true } });
      categoryId = existing?.company_id ? await this.resolveCategoryId(existing.company_id, data.category_name) : undefined;
    }

    return this.prisma.products.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(categoryId !== undefined ? { category_id: categoryId } : {}),
      },
    });
  }

  /**
   * Soft-delete only: real products/product_sizes are referenced by historical sale_items, so a
   * hard delete would either fail on the FK constraint or destroy real revenue history. Flipping
   * is_active hides it from the active menu (findAll above) everywhere, instantly, while keeping
   * past sales numbers accurate. Reversible via update({ is_active: true }) if needed later.
   */
  async remove(id: number) {
    return this.prisma.products.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
