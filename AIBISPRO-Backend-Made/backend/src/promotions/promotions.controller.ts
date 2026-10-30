import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PromotionsService } from "./promotions.service";
import { CompaniesService } from "../companies/companies.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("Promotions")
@Controller("promotions")
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiOperation({
    summary: "Get all promotions (optionally filtered by companyId)",
  })
  @Get()
  findAll(@Query("companyId") companyId?: string) {
    return this.promotionsService.findAll(
      companyId ? Number(companyId) : undefined,
    );
  }

  @ApiOperation({
    summary: "Get promotion by ID",
  })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.promotionsService.findOne(Number(id));
  }

  @ApiBearerAuth()
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: "Create promotion",
  })
  @Post()
  async create(
    @Body()
    body: {
      title: string;
      description?: string;
      discount_percent?: number;
      start_date?: string;
      end_date?: string;
      status?: string;
      company_id: number;
    },
    @Req() req: any,
  ) {
    await this.companiesService.assertAccess(
      Number(req.user.id),
      req.user.role,
      Number(body.company_id),
    );
    return this.promotionsService.create({
      ...body,
      created_by: Number(req.user.id),
    });
  }

  @ApiBearerAuth()
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary:
      "Update promotion details (title/description/dates/flyer image) - does not accept status changes, use /approve or /reject for that",
  })
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      discount_percent?: number;
      status?: string;
      image_url?: string;
      start_date?: string;
      end_date?: string;
    },
    @Req() req: any,
  ) {
    const existing = await this.promotionsService.findOne(Number(id));
    if (existing?.company_id) {
      await this.companiesService.assertAccess(
        Number(req.user.id),
        req.user.role,
        existing.company_id,
      );
    }
    if (body.status !== undefined && req.user.role === "MANAGER") {
      throw new ForbiddenException(
        "Only Owner or Maintainance can approve or reject a promotion - use /promotions/:id/approve or /reject",
      );
    }
    return this.promotionsService.update(Number(id), body);
  }

  @ApiBearerAuth()
  @Roles("MAINTAINANCE", "OWNER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: "Approve a pending promotion (Owner only)",
  })
  @Patch(":id/approve")
  async approve(@Param("id") id: string, @Req() req: any) {
    const existing = await this.promotionsService.findOne(Number(id));
    if (!existing) throw new NotFoundException("Promotion not found");
    if (existing.company_id) {
      await this.companiesService.assertAccess(
        Number(req.user.id),
        req.user.role,
        existing.company_id,
      );
    }
    return this.promotionsService.review(Number(id), Number(req.user.id), true);
  }

  @ApiBearerAuth()
  @Roles("MAINTAINANCE", "OWNER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: "Reject a pending promotion (Owner only)",
  })
  @Patch(":id/reject")
  async reject(@Param("id") id: string, @Req() req: any) {
    const existing = await this.promotionsService.findOne(Number(id));
    if (!existing) throw new NotFoundException("Promotion not found");
    if (existing.company_id) {
      await this.companiesService.assertAccess(
        Number(req.user.id),
        req.user.role,
        existing.company_id,
      );
    }
    return this.promotionsService.review(
      Number(id),
      Number(req.user.id),
      false,
    );
  }

  @ApiBearerAuth()
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: "Delete promotion",
  })
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: any) {
    const existing = await this.promotionsService.findOne(Number(id));
    if (existing?.company_id) {
      await this.companiesService.assertAccess(
        Number(req.user.id),
        req.user.role,
        existing.company_id,
      );
    }
    return this.promotionsService.remove(Number(id));
  }
}
