import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('top-products')
  getTopProducts() {
    return this.analyticsService.getTopProducts();
  }

  @Get('revenue-summary')
  getRevenueSummary() {
    return this.analyticsService.getRevenueSummary();
  }
}