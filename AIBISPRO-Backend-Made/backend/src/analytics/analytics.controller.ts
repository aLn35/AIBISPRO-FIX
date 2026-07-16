import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('top-products')
  getTopProducts(@Query('companyId') companyId?: string) {
    return this.analyticsService.getTopProducts(companyId ? Number(companyId) : undefined);
  }

  @Get('revenue-summary')
  getRevenueSummary(@Query('companyId') companyId?: string) {
    return this.analyticsService.getRevenueSummary(companyId ? Number(companyId) : undefined);
  }

  @Get('low-stock')
  getLowStock(@Query('companyId') companyId?: string) {
    return this.analyticsService.getLowStock(companyId ? Number(companyId) : undefined);
  }
}
