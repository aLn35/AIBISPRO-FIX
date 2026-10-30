import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: number) {
    return this.prisma.promotions.findMany({
      where: companyId ? { company_id: companyId } : undefined,
      orderBy: {
        created_at: "desc",
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.promotions.findUnique({
      where: {
        id,
      },
    });
  }

  async create(data: {
    title: string;
    description?: string;
    discount_percent?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
    company_id: number;
    created_by?: number;
  }) {
    const todayStr = new Date().toISOString().split("T")[0];
    if (data.start_date && data.start_date < todayStr) {
      throw new BadRequestException("Promo start date cannot be in the past");
    }
    if (data.end_date && data.start_date && data.end_date < data.start_date) {
      throw new BadRequestException(
        "Promo end date cannot be before the start date",
      );
    }

    return this.prisma.promotions.create({
      data: {
        title: data.title,
        description: data.description,
        discount_percent: data.discount_percent,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        status: data.status ?? "pending",
        company_id: data.company_id,
        created_by: data.created_by,
      },
    });
  }

  async update(
    id: number,
    data: {
      title?: string;
      description?: string;
      discount_percent?: number;
      status?: string;
      approved_by?: number;
      image_url?: string;
      start_date?: string;
      end_date?: string;
    },
  ) {
    const { start_date, end_date, ...rest } = data;
    return this.prisma.promotions.update({
      where: { id },
      data: {
        ...rest,
        ...(start_date !== undefined
          ? { start_date: start_date ? new Date(start_date) : null }
          : {}),
        ...(end_date !== undefined
          ? { end_date: end_date ? new Date(end_date) : null }
          : {}),
      },
    });
  }

  async remove(id: number) {
    return this.prisma.promotions.delete({
      where: {
        id,
      },
    });
  }

  async review(id: number, reviewerId: number, approve: boolean) {
    const promo = await this.prisma.promotions.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException("Promotion not found");
    if (promo.status !== "pending")
      throw new BadRequestException("This promotion has already been reviewed");

    return this.prisma.promotions.update({
      where: { id },
      data: {
        status: approve ? "active" : "rejected",
        approved_by: reviewerId,
      },
    });
  }
}
