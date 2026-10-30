import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { FileInterceptor } from "@nestjs/platform-express";

import { UploadService } from "./upload.service";
import { CompaniesService } from "../companies/companies.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("Upload")
@Controller("upload")
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Upload history (optionally filtered by companyId)",
  })
  @UseGuards(JwtAuthGuard)
  @Get("history")
  getHistory(@Query("companyId") companyId?: string) {
    return this.uploadService.getHistory(
      companyId ? Number(companyId) : undefined,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Read-only preview of a previously uploaded file's parsed rows",
  })
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  getDetail(@Param("id") id: string) {
    return this.uploadService.getDatasetDetail(Number(id));
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Delete an uploaded dataset AND the sales/sale_items it created (undo an accidental or duplicate import)",
  })
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(":id")
  async deleteDataset(@Param("id") id: string, @Req() req: any) {
    const dataset = await this.uploadService.getDatasetDetail(Number(id));
    if (!dataset) throw new NotFoundException("Dataset not found");
    if (dataset.company_id) {
      await this.companiesService.assertAccess(
        Number(req.user.id),
        req.user.role,
        dataset.company_id,
      );
    }
    return this.uploadService.deleteDataset(Number(id));
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
    summary: "Upload sales CSV or Excel file for a specific company",
  })
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post("sales")
  @UseInterceptors(
    FileInterceptor("file", {
      dest: "./uploads",
    }),
  )
  async uploadSales(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException("A CSV or Excel file is required");
    }

    const companyId = Number(req.body.companyId);
    if (!companyId) {
      throw new BadRequestException("companyId is required");
    }
    await this.companiesService.assertAccess(
      Number(req.user.id),
      req.user.role,
      companyId,
    );

    const name = file.originalname.toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

    if (!isCsv && !isExcel) {
      throw new BadRequestException(
        "Only .csv, .xlsx, or .xls files are allowed",
      );
    }

    const dataset = await this.uploadService.createDataset(
      file.originalname,
      Number(req.user.id),
      companyId,
    );

    try {
      const rows = isCsv
        ? await this.uploadService.parseCsv(file.path)
        : await this.uploadService.parseExcel(file.path);

      const result = await this.uploadService.importSales(
        rows,
        companyId,
        dataset.id,
      );

      const updatedDataset = await this.uploadService.updateDatasetStatus(
        dataset.id,
        "processed",
        rows.length,
        rows,
      );

      return {
        message: "Sales imported successfully",
        dataset: updatedDataset,
        totalRows: rows.length,
        salesCreated: result.summary.salesCreated,
        imported: result.imported.length,
        failed: result.failed,
        newProductsCreated: result.summary.newProductsCreated,
        newCategoriesCreated: result.summary.newCategoriesCreated,
      };
    } catch (error: any) {
      await this.uploadService.updateDatasetStatus(dataset.id, "failed");
      throw new InternalServerErrorException(error.message);
    }
  }
}
