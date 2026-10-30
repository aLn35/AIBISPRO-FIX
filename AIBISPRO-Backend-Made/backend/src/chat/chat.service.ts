import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AIService } from "../services/ai/ai.service";
import { CompaniesService } from "../companies/companies.service";
import { GoogleGenAI } from "@google/genai";

function formatMoney(n: number): string {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

const ROLE_FRAMING: Record<string, string> = {
  MAINTAINANCE:
    "You are advising a MAINTAINANCE (salesforce/partnership manager) who oversees the relationship between AIBISPRO and several partner companies. They care about cross-company health, which partnerships are thriving vs struggling, and whether any partnership should be reconsidered or dropped. When no specific company is selected, speak at a portfolio level across all their partner companies.",
  OWNER:
    "You are advising an OWNER (the business owner of this company). They care about overall financial performance, profit margins, growth strategy, and high-level decisions like new promotions, bundles, or menu changes.",
  MANAGER:
    "You are advising a MANAGER (day-to-day operations lead at this company, reporting to the owner). They care about frontline execution: stock levels, restocking urgency, daily/weekly sales, and operational promotion ideas.",
};

interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

@Injectable()
export class ChatService {
  private gemini: GoogleGenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly companiesService: CompaniesService,
  ) {}

  private getGeminiClient(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    if (!this.gemini) this.gemini = new GoogleGenAI({ apiKey: key });
    return this.gemini;
  }

  /** Calls a generic OpenAI-compatible chat completions endpoint (LLM_API_URL/LLM_API_KEY/LLM_MODEL). */
  private async callOpenAiCompatible(messages: LlmMessage[]): Promise<string> {
    const res = await fetch(process.env.LLM_API_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        messages,
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `LLM endpoint returned ${res.status}: ${text.slice(0, 300)}`,
      );
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM response had no message content");
    return content;
  }

  private async buildCompanyContext(companyId: number) {
    const company = await this.prisma.companies.findUnique({
      where: { id: companyId },
    });
    const [forecast, risk, promotion, demand, recommendations, dashboard] =
      await Promise.all([
        this.aiService.forecast(companyId),
        this.aiService.risk(companyId),
        this.aiService.promotion(companyId),
        this.aiService.demand(companyId),
        this.aiService.recommendations(companyId),
        this.prisma.sales.aggregate({
          where: { company_id: companyId },
          _sum: { total_amount: true },
          _count: { id: true },
        }),
      ]);
    const activePromotions = await this.prisma.promotions.findMany({
      where: { company_id: companyId, status: "active" },
    });

    const mlPoweredCount = [
      forecast,
      risk,
      promotion,
      demand,
      recommendations,
    ].filter((r) => r.method?.startsWith("ml_")).length;
    const dataSource =
      mlPoweredCount > 0
        ? `${mlPoweredCount}/5 of the predictions below (forecast/risk/promotion/demand/recommendations) come from trained ML models — a Random Forest demand model, a Holt-Winters revenue forecast, and Apriori basket-affinity rules, all trained on this company's real uploaded sales history. The rest fall back to statistical methods due to limited data.`
        : `Predictions below currently use statistical/rule-based fallbacks — this company doesn't yet have enough real uploaded sales history for the trained ML models.`;

    return {
      company: {
        id: company?.id,
        name: company?.name,
        type: company?.type,
        location: company?.location,
        partnershipStatus: company?.partnership_status,
      },
      dataSource,
      totalRevenueAllTime: dashboard._sum.total_amount ?? 0,
      totalTransactionsAllTime: dashboard._count.id,
      revenueForecastNext7Days: forecast.forecast
        .slice(0, 7)
        .reduce((s, f) => s + f.predicted_revenue, 0),
      revenueTrend: forecast.trend,
      forecastConfidenceR2: forecast.r_squared,
      stockRisks: risk.data.slice(0, 8),
      promotionSuggestions: promotion.data.slice(0, 5),
      topDemandProducts: demand.data.slice(0, 8),
      frequentlyBoughtTogether: recommendations.data.slice(0, 5),
      activePromotions: activePromotions.map((p) => ({
        title: p.title,
        discountPercent: p.discount_percent,
        endDate: p.end_date,
      })),
    };
  }

  private async buildPortfolioContext(companyIds: number[]) {
    const result = await this.aiService.portfolioOverview(companyIds);
    return { portfolio: result.data };
  }

  async handleMessage(
    userId: number,
    role: string,
    message: string,
    companyId?: number,
    sessionId?: string,
  ) {
    if (role === "CUSTOMER") {
      throw new ForbiddenException(
        "The AI assistant is only available to MAINTAINANCE, OWNER, and MANAGER accounts",
      );
    }

    if (companyId) {
      await this.companiesService.assertAccess(userId, role, companyId);
    }

    let session = sessionId
      ? await this.prisma.chat_sessions.findUnique({ where: { id: sessionId } })
      : null;
    if (!session || session.user_id !== userId) {
      session = await this.prisma.chat_sessions.create({
        data: {
          user_id: userId,
          company_id: companyId,
          title: message.slice(0, 60),
        },
      });
    }
    sessionId = session.id;

    const recentLogs = await this.prisma.chatbot_logs.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "desc" },
      take: 20,
    });
    const history = recentLogs
      .reverse()
      .map((l) => ({ question: l.question, answer: l.answer }));

    let context: any;
    if (companyId) {
      context = await this.buildCompanyContext(companyId);
    } else if (role === "MAINTAINANCE") {
      const ids = await this.companiesService.getAccessibleCompanyIds(
        userId,
        role,
      );
      const allIds =
        ids === null
          ? (await this.companiesService.findAll()).map((c) => c.id)
          : ids;
      context = await this.buildPortfolioContext(allIds);
    } else {
      const accessible = await this.companiesService.findAccessibleTo(
        userId,
        role,
      );
      if (accessible.length > 0) {
        companyId = accessible[0].id;
        context = await this.buildCompanyContext(companyId);
      } else {
        context = { note: "This user has no companies assigned yet." };
      }
    }

    const systemInstruction = `You are the AIBISPRO AI Advisor, a friendly and sharp business consulting assistant embedded in a restaurant/cafe/F&B business intelligence platform.

${ROLE_FRAMING[role] ?? ""}

CRITICAL GROUNDING RULES:
- You may chat casually (greetings, small talk, "how are you", etc.) freely and naturally.
- Whenever you state a number, fact, or recommendation about the business (revenue, stock, forecasts, products, promotions, which company to prioritize or drop, etc.), you MUST base it strictly on the DATA CONTEXT JSON provided below. Never invent figures that aren't derivable from it.
- If the user asks something the data context can't answer, say so honestly instead of guessing.
- Reply in the same language the user writes in (Bahasa Indonesia or English) - match their language naturally.
- Be concise but genuinely useful: use bullet points or short paragraphs, bold key numbers, and give concrete actionable suggestions when asked about strategy, discounts, bundles, timing, or underperforming products/companies.
- All monetary figures in the data are in Indonesian Rupiah (IDR).
- If the DATA CONTEXT includes a "dataSource" note, that describes whether the numbers come from trained ML models or a statistical fallback. Only mention this if the user directly asks how a prediction was generated — don't bring it up unprompted.

DATA CONTEXT (real, live data — the only source of truth for numbers):
${JSON.stringify(context, null, 2)}`;

    let answer: string;
    let method: string;

    const hasCustomLlm = !!(process.env.LLM_API_URL && process.env.LLM_API_KEY);
    const geminiClient = !hasCustomLlm ? this.getGeminiClient() : null;

    if (hasCustomLlm) {
      try {
        const messages: LlmMessage[] = [
          { role: "system", content: systemInstruction },
          ...history.slice(-10).flatMap((h): LlmMessage[] => [
            { role: "user", content: h.question },
            { role: "assistant", content: h.answer },
          ]),
          { role: "user", content: message },
        ];
        answer = await this.callOpenAiCompatible(messages);
        method = `llm_rag_${process.env.LLM_MODEL}`;
      } catch (err: any) {
        console.error("Custom LLM call failed:", err?.message);
        answer = await this.fallbackAnswer(message, context);
        method = "grounded_template_fallback_llm_error";
      }
    } else if (geminiClient) {
      const contents: any[] = [];
      for (const h of history.slice(-10)) {
        contents.push({ role: "user", parts: [{ text: h.question }] });
        contents.push({ role: "model", parts: [{ text: h.answer }] });
      }
      contents.push({ role: "user", parts: [{ text: message }] });

      try {
        const response = await geminiClient.models.generateContent({
          model: "gemini-flash-lite-latest",
          contents,
          config: { systemInstruction, temperature: 0.6 },
        });
        answer =
          response.text ||
          "I wasn't able to generate a response — please try again.";
        method = "llm_rag_gemini";
      } catch (err: any) {
        console.error("Gemini call failed:", err?.message);
        answer = await this.fallbackAnswer(message, context);
        method = "grounded_template_fallback_llm_error";
      }
    } else {
      answer = await this.fallbackAnswer(message, context);
      method = "grounded_template_no_llm_key";
    }

    await this.prisma.chatbot_logs.create({
      data: {
        user_id: userId,
        company_id: companyId,
        session_id: sessionId,
        question: message,
        answer,
      },
    });
    // Touch the session so it bubbles to the top of the "recent conversations" list.
    await this.prisma.chat_sessions.update({
      where: { id: sessionId },
      data: { updated_at: new Date() },
    });

    return { answer, method, companyId, sessionId, data: context };
  }

  /** Deterministic fallback used only when no LLM is configured or the call fails. */
  private async fallbackAnswer(message: string, context: any): Promise<string> {
    const m = message.toLowerCase();
    if (
      /low.*stock|stock.*low|restock|running out/.test(m) &&
      context.stockRisks
    ) {
      if (context.stockRisks.length === 0)
        return "No products are currently at or below minimum stock.";
      return `You have ${context.stockRisks.length} item(s) at risk:\n${context.stockRisks
        .map(
          (r: any) =>
            `- ${r.productName} (${r.sizeName}): ${r.currentStock} left [${r.severity}]`,
        )
        .join("\n")}`;
    }
    if (
      /forecast|predict|revenue/.test(m) &&
      context.revenueForecastNext7Days !== undefined
    ) {
      return `Projected revenue for the next 7 days: ${formatMoney(context.revenueForecastNext7Days)} (trend: ${context.revenueTrend}).`;
    }
    if (/promo|discount/.test(m) && context.promotionSuggestions) {
      return context.promotionSuggestions.length
        ? context.promotionSuggestions
            .map(
              (p: any) =>
                `- ${p.productName}: suggested ${p.suggestedDiscountPercent}% discount (${p.reason})`,
            )
            .join("\n")
        : "No promotion suggestions right now.";
    }
    return "I can answer questions about stock, forecasts, promotions, and recommendations. (Note: free-form conversation requires a configured LLM — ask your administrator to set one up.)";
  }

  /** Full message history for one specific conversation session (ownership-checked). */
  async getHistory(userId: number, sessionId: string) {
    const session = await this.prisma.chat_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.user_id !== userId) return [];
    return this.prisma.chatbot_logs.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "asc" },
    });
  }

  /** List of this user's past conversations for this scope (a company, or portfolio-level
   * when companyId is omitted), most recently active first. */
  async getSessions(userId: number, companyId?: number) {
    return this.prisma.chat_sessions.findMany({
      where: { user_id: userId, company_id: companyId ?? null },
      orderBy: { updated_at: "desc" },
      include: { _count: { select: { chatbot_logs: true } } },
    });
  }

  async deleteSession(sessionId: string, userId: number) {
    const session = await this.prisma.chat_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.user_id !== userId) return { ok: false };
    await this.prisma.chat_sessions.delete({ where: { id: sessionId } });
    return { ok: true };
  }
}
