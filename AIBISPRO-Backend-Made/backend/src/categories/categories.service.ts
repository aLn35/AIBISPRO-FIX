import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: number) {
    return this.prisma.categories.findMany({
      where: companyId ? { company_id: companyId } : undefined,
      orderBy: {
        id: "asc",
      },
    });
  }
}
