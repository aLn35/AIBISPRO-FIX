import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { CompaniesService } from '../companies/companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiOperation({
    summary: 'Get all products (optionally filtered by companyId)',
  })
  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.productsService.findAll(companyId ? Number(companyId) : undefined);
  }

  @ApiOperation({
    summary: 'Get product by ID',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(
      Number(id),
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create product',
  })
  @Roles('MAINTAINANCE', 'OWNER', 'MANAGER')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Post()
  async create(
    @Body()
    body: {
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
    },
    @Req() req: any,
  ) {
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, Number(body.company_id));
    return this.productsService.create(body);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update product',
  })
  @Roles('MAINTAINANCE', 'OWNER', 'MANAGER')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      category_id?: string;
      category_name?: string;
    },
    @Req() req: any,
  ) {
    const existing = await this.productsService.findOne(Number(id));
    if (existing?.company_id) {
      await this.companiesService.assertAccess(Number(req.user.id), req.user.role, existing.company_id);
    }
    return this.productsService.update(
      Number(id),
      body,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove a product from the active menu (soft delete - keeps historical sales intact)',
  })
  @Roles('MAINTAINANCE', 'OWNER', 'MANAGER')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const existing = await this.productsService.findOne(Number(id));
    if (existing?.company_id) {
      await this.companiesService.assertAccess(Number(req.user.id), req.user.role, existing.company_id);
    }
    return this.productsService.remove(
      Number(id),
    );
  }
}
