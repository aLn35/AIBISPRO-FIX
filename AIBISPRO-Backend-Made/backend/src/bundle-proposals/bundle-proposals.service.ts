import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BundleProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    company_id: number;
    name: string;
    product_ids: number[];
    product_names?: string[];
    regular_price: number;
    bundle_price: number;
    strategy?: string;
    created_by: number;
  }) {
    return this.prisma.bundle_proposals.create({ data });
  }

  async findAll(companyId?: number) {
    return this.prisma.bundle_proposals.findMany({
      where: companyId ? { company_id: companyId } : undefined,
      orderBy: { created_at: "desc" },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.bundle_proposals.findUnique({ where: { id } });
  }

  async review(
    id: number,
    reviewerId: number,
    approve: boolean,
    reviewNote?: string,
  ) {
    const proposal = await this.prisma.bundle_proposals.findUnique({
      where: { id },
    });
    if (!proposal) throw new NotFoundException("Bundle proposal not found");
    if (proposal.status !== "pending")
      throw new BadRequestException("This proposal has already been reviewed");

    return this.prisma.bundle_proposals.update({
      where: { id },
      data: {
        status: approve ? "approved" : "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        review_note: reviewNote,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.bundle_proposals.delete({ where: { id } });
  }
}
