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
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { InboxService } from './inbox.service';
import { CompaniesService } from '../companies/companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Inbox')
@ApiBearerAuth()
@Roles('MAINTAINANCE', 'OWNER', 'MANAGER')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inbox')
export class InboxController {
  constructor(
    private readonly inboxService: InboxService,
    private readonly companiesService: CompaniesService,
  ) {}

  @ApiOperation({ summary: 'Get the message thread for a company (MAINTAINANCE/OWNER/MANAGER with access)' })
  @Get()
  async findForCompany(@Query('companyId') companyId: string, @Req() req: any) {
    const numericCompanyId = Number(companyId);
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, numericCompanyId);
    return this.inboxService.findForCompany(numericCompanyId);
  }

  @ApiOperation({ summary: 'Count unread messages (not authored by me) for a company - for sidebar badges' })
  @Get('unread-count')
  async countUnread(@Query('companyId') companyId: string, @Req() req: any) {
    const numericCompanyId = Number(companyId);
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, numericCompanyId);
    const count = await this.inboxService.countUnread(numericCompanyId, Number(req.user.id));
    return { count };
  }

  @ApiOperation({ summary: 'Post a message to a company thread' })
  @Post()
  async create(@Body() body: { companyId: number; message: string; aiGenerated?: boolean }, @Req() req: any) {
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, Number(body.companyId));
    return this.inboxService.create({
      company_id: Number(body.companyId),
      author_id: Number(req.user.id),
      message: body.message,
      ai_generated: body.aiGenerated,
    });
  }

  @ApiOperation({ summary: 'Mark every message in a company thread not authored by me as read' })
  @Patch('read')
  async markRead(@Query('companyId') companyId: string, @Req() req: any) {
    const numericCompanyId = Number(companyId);
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, numericCompanyId);
    await this.inboxService.markThreadRead(numericCompanyId, Number(req.user.id));
    return { ok: true };
  }

  @ApiOperation({ summary: 'Edit my own message' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { message: string }, @Req() req: any) {
    const msg = await this.inboxService.findOne(Number(id));
    if (!msg || msg.is_deleted) throw new NotFoundException('Message not found');
    if (msg.author_id !== Number(req.user.id)) throw new ForbiddenException('You can only edit your own messages');
    return this.inboxService.update(Number(id), body.message);
  }

  @ApiOperation({ summary: 'Unsend my own message' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const msg = await this.inboxService.findOne(Number(id));
    if (!msg || msg.is_deleted) throw new NotFoundException('Message not found');
    if (msg.author_id !== Number(req.user.id)) throw new ForbiddenException('You can only unsend your own messages');
    return this.inboxService.softDelete(Number(id));
  }
}
