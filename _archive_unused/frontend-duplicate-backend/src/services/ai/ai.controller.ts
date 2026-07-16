import { Controller, Get } from "@nestjs/common";
import { AIService } from "./ai.service";

@Controller("ai")
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get("demand")
  async demand() {
    const result = await this.aiService.demand();
    return { success: true, data: result.data ?? result };
  }

  @Get("promotion")
  async promotion() {
    const result = await this.aiService.promotion();
    return { success: true, data: result.data ?? result };
  }

  @Get("forecast")
  async forecast() {
    const result = await this.aiService.forecast();
    return { success: true, data: result.data ?? result };
  }

  @Get("risk")
  async risk() {
    const result = await this.aiService.risk();
    return { success: true, data: result.data ?? result };
  }

  @Get("recommendations")
  async recommendations() {
    return { success: true, data: [] };
  }
}