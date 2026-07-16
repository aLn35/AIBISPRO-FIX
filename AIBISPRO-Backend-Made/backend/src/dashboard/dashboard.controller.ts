import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Query('companyId') companyId?: string) {
    return this.dashboardService.getSummary(companyId ? Number(companyId) : undefined);
  }
}
