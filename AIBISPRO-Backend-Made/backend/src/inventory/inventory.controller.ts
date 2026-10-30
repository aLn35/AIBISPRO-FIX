import {
  Body,
  Controller,
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

import { InventoryService } from "./inventory.service";
import { CompaniesService } from "../companies/companies.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("Inventory")
@Controller("inventory")
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiOperation({
    summary: "Get inventory list (optionally filtered by companyId)",
  })
  @Get()
  findAll(@Query("companyId") companyId?: string) {
    return this.inventoryService.findAll(
      companyId ? Number(companyId) : undefined,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Add stock (increments current stock)",
  })
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post("stock-in")
  async stockIn(
    @Body()
    body: {
      product_size_id: number;
      quantity: number;
      notes?: string;
    },
    @Req() req: any,
  ) {
    const size = await this.inventoryService.findOneWithCompany(
      Number(body.product_size_id),
    );
    if (!size) throw new NotFoundException("Product size not found");
    if (size.products?.company_id) {
      await this.companiesService.assertAccess(
        Number(req.user.id),
        req.user.role,
        size.products.company_id,
      );
    }
    return this.inventoryService.stockIn(body);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Edit a menu item's size name, price, cost, or stock levels directly",
  })
  @Roles("MAINTAINANCE", "OWNER", "MANAGER")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body()
    body: {
      size_name?: string;
      selling_price?: number;
      cost_price?: number;
      current_stock?: number;
      minimum_stock?: number;
    },
    @Req() req: any,
  ) {
    const size = await this.inventoryService.findOneWithCompany(Number(id));
    if (!size) throw new NotFoundException("Product size not found");
    if (size.products?.company_id) {
      await this.companiesService.assertAccess(
        Number(req.user.id),
        req.user.role,
        size.products.company_id,
      );
    }
    return this.inventoryService.update(Number(id), body);
  }
}
