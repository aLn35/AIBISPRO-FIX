import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BundleProposalsService } from './bundle-proposals.service';
import { CompaniesService } from '../companies/companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Bundle Proposals')
@Controller('bundle-proposals')
export class BundleProposalsController {
  constructor(
    private readonly bundleProposalsService: BundleProposalsService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Combo bundle proposal history (optionally filtered by companyId)' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query('companyId') companyId: string, @Req() req: any) {
    if (companyId) {
      await this.companiesService.assertAccess(Number(req.user.id), req.user.role, Number(companyId));
    }
    return this.bundleProposalsService.findAll(companyId ? Number(companyId) : undefined);
  }

  @ApiBearerAuth()
  @Roles('OWNER', 'MANAGER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Propose a combo bundle, pending Owner review' })
  @Post()
  async create(
    @Body()
    body: {
      company_id: number;
      name: string;
      product_ids: number[];
      product_names?: string[];
      regular_price: number;
      bundle_price: number;
      strategy?: string;
    },
    @Req() req: any,
  ) {
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, Number(body.company_id));
    return this.bundleProposalsService.create({ ...body, created_by: Number(req.user.id) });
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE', 'OWNER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Approve a combo bundle proposal (Owner only)' })
  @Patch(':id/approve')
  async approve(@Param('id') id: string, @Body() body: { note?: string }, @Req() req: any) {
    const existing = await this.bundleProposalsService.findOne(Number(id));
    if (!existing) throw new NotFoundException('Bundle proposal not found');
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, existing.company_id);
    return this.bundleProposalsService.review(Number(id), Number(req.user.id), true, body?.note);
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE', 'OWNER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Reject a combo bundle proposal (Owner only)' })
  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Body() body: { note?: string }, @Req() req: any) {
    const existing = await this.bundleProposalsService.findOne(Number(id));
    if (!existing) throw new NotFoundException('Bundle proposal not found');
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, existing.company_id);
    return this.bundleProposalsService.review(Number(id), Number(req.user.id), false, body?.note);
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE', 'OWNER', 'MANAGER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a combo bundle proposal' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const existing = await this.bundleProposalsService.findOne(Number(id));
    if (!existing) throw new NotFoundException('Bundle proposal not found');
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, existing.company_id);
    return this.bundleProposalsService.remove(Number(id));
  }
}
