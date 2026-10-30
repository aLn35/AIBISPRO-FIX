import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";

import { RestockRequestsService } from "./restock-requests.service";
import { CompaniesService } from "../companies/companies.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("Restock Requests")
@Controller("restock-requests")
export class RestockRequestsController {
  constructor(
    private readonly restockRequestsService: RestockRequestsService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Restock request history (optionally filtered by companyId)",
  })
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query("companyId") companyId: string, @Req() req: any) {
    if (companyId) {
      await this.companiesService.assertAccess(
        Number(req.user.id),
        req.user.role,
        Number(companyId),
      );
    }
    return this.restockRequestsService.findAll(
      companyId ? Number(companyId) : undefined,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Export the full Approval Center history (restock requests, combo bundles, promotions) as a multi-sheet .xlsx workbook",
  })
  @UseGuards(JwtAuthGuard)
  @Get("export")
  async exportSpreadsheet(
    @Query("companyId") companyId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!companyId) throw new BadRequestException("companyId is required");
    await this.companiesService.assertAccess(
      Number(req.user.id),
      req.user.role,
      Number(companyId),
    );
    const buffer = await this.restockRequestsService.exportToWorkbook(
      Number(companyId),
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="approval-history-${companyId}.xlsx"`,
    });
    res.send(buffer);
  }

  @ApiBearerAuth()
  @Roles("OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: "Submit a restock request (Manager to Owner, or Owner to Manager)",
  })
  @Post()
  async create(
    @Body()
    body: {
      company_id: number;
      product_size_id?: number;
      product_name: string;
      quantity: number;
      supplier_name?: string;
      estimated_cost?: number;
      notes?: string;
    },
    @Req() req: any,
  ) {
    await this.companiesService.assertAccess(
      Number(req.user.id),
      req.user.role,
      Number(body.company_id),
    );
    return this.restockRequestsService.create({
      ...body,
      initiated_by: Number(req.user.id),
      initiated_by_role: req.user.role,
    });
  }

  @ApiBearerAuth()
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary:
      "Approve a restock request (only the role that did NOT initiate it)",
  })
  @Patch(":id/approve")
  async approve(
    @Param("id") id: string,
    @Body() body: { note?: string },
    @Req() req: any,
  ) {
    const existing = await this.restockRequestsService.findOne(Number(id));
    if (!existing) throw new NotFoundException("Restock request not found");
    await this.companiesService.assertAccess(
      Number(req.user.id),
      req.user.role,
      existing.company_id,
    );
    return this.restockRequestsService.review(
      Number(id),
      Number(req.user.id),
      req.user.role,
      true,
      body?.note,
    );
  }

  @ApiBearerAuth()
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary:
      "Reject a restock request (only the role that did NOT initiate it)",
  })
  @Patch(":id/reject")
  async reject(
    @Param("id") id: string,
    @Body() body: { note?: string },
    @Req() req: any,
  ) {
    const existing = await this.restockRequestsService.findOne(Number(id));
    if (!existing) throw new NotFoundException("Restock request not found");
    await this.companiesService.assertAccess(
      Number(req.user.id),
      req.user.role,
      existing.company_id,
    );
    return this.restockRequestsService.review(
      Number(id),
      Number(req.user.id),
      req.user.role,
      false,
      body?.note,
    );
  }

  @ApiBearerAuth()
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary:
      "Delete a restock request (undo an accidental submission or import)",
  })
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: any) {
    const existing = await this.restockRequestsService.findOne(Number(id));
    if (!existing) throw new NotFoundException("Restock request not found");
    await this.companiesService.assertAccess(
      Number(req.user.id),
      req.user.role,
      existing.company_id,
    );
    return this.restockRequestsService.remove(Number(id));
  }

  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        companyId: { type: "number" },
      },
    },
  })
  @ApiOperation({
    summary: "Import restock request history from a CSV or Excel file",
  })
  @Roles("OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post("import")
  @UseInterceptors(FileInterceptor("file", { dest: "./uploads" }))
  async importSpreadsheet(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException("A CSV or Excel file is required");

    const companyId = Number(req.body.companyId);
    if (!companyId) throw new BadRequestException("companyId is required");
    await this.companiesService.assertAccess(
      Number(req.user.id),
      req.user.role,
      companyId,
    );

    const name = file.originalname.toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
    if (!isCsv && !isExcel)
      throw new BadRequestException(
        "Only .csv, .xlsx, or .xls files are allowed",
      );

    try {
      const rows = isCsv
        ? await this.restockRequestsService.parseCsv(file.path)
        : await this.restockRequestsService.parseExcel(file.path);

      const result = await this.restockRequestsService.importRows(
        rows,
        companyId,
        Number(req.user.id),
        req.user.role,
      );

      return {
        message: "Restock request history imported successfully",
        totalRows: rows.length,
        imported: result.imported.length,
        duplicates: result.duplicates,
        failed: result.failed,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
