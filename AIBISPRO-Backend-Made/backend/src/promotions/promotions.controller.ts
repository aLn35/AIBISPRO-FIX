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

import { PromotionsService } from './promotions.service';
import { CompaniesService } from '../companies/companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiOperation({
    summary: 'Get all promotions (optionally filtered by companyId)',
  })
  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.promotionsService.findAll(companyId ? Number(companyId) : undefined);
  }

  @ApiOperation({
    summary: 'Get promotion by ID',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(
      Number(id),
    );
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE', 'OWNER', 'MANAGER')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Create promotion',
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
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, Number(body.company_id));
    return this.promotionsService.create({ ...body, created_by: Number(req.user.id) });
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE', 'OWNER', 'MANAGER')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Update promotion (approve/reject/edit)',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      discount_percent?: number;
      status?: string;
    },
  ) {
    return this.promotionsService.update(
      Number(id),
      body,
    );
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE', 'OWNER', 'MANAGER')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Delete promotion',
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(
      Number(id),
    );
  }
}
