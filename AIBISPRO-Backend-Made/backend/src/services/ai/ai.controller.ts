import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AIService } from "./ai.service";
import { CompaniesService } from "../../companies/companies.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

@Controller("ai")
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly companiesService: CompaniesService,
  ) {}

  private async resolveCompanyId(req: any, companyId?: string): Promise<number> {
    if (!companyId) throw new BadRequestException("companyId is required");
    await this.companiesService.assertAccess(Number(req.user.id), req.user.role, Number(companyId));
    return Number(companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("demand")
  async demand(@Query("companyId") companyId: string, @Req() req: any) {
    const id = await this.resolveCompanyId(req, companyId);
    const result = await this.aiService.demand(id);
    return { success: true, method: result.method, data: result.data };
  }

  @UseGuards(JwtAuthGuard)
  @Get("promotion")
  async promotion(@Query("companyId") companyId: string, @Req() req: any) {
    const id = await this.resolveCompanyId(req, companyId);
    const result = await this.aiService.promotion(id);
    return { success: true, method: result.method, data: result.data };
  }

  @UseGuards(JwtAuthGuard)
  @Get("forecast")
  async forecast(@Query("companyId") companyId: string, @Req() req: any) {
    const id = await this.resolveCompanyId(req, companyId);
    const result = await this.aiService.forecast(id);
    return { success: true, method: result.method, data: result };
  }

  @UseGuards(JwtAuthGuard)
  @Get("risk")
  async risk(@Query("companyId") companyId: string, @Req() req: any) {
    const id = await this.resolveCompanyId(req, companyId);
    const result = await this.aiService.risk(id);
    return { success: true, method: result.method, data: result.data };
  }

  @UseGuards(JwtAuthGuard)
  @Get("recommendations")
  async recommendations(@Query("companyId") companyId: string, @Req() req: any) {
    const id = await this.resolveCompanyId(req, companyId);
    const result = await this.aiService.recommendations(id);
    return { success: true, method: result.method, data: result.data };
  }

  @UseGuards(JwtAuthGuard)
  @Get("insights")
  async insights(@Query("companyId") companyId: string, @Req() req: any) {
    const id = await this.resolveCompanyId(req, companyId);
    const result = await this.aiService.insights(id);
    return { success: true, method: result.method, data: result.data };
  }

  @UseGuards(JwtAuthGuard)
  @Get("portfolio")
  async portfolio(@Req() req: any) {
    const ids = await this.companiesService.getAccessibleCompanyIds(Number(req.user.id), req.user.role);
    const allIds = ids === null ? (await this.companiesService.findAll()).map((c) => c.id) : ids;
    const result = await this.aiService.portfolioOverview(allIds);
    return { success: true, method: result.method, data: result.data };
  }
}
