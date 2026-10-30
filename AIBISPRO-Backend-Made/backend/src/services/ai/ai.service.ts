import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, r2 };
}

@Injectable()
export class AIService {
  constructor(private readonly prisma: PrismaService) {}

  /** Calls the Python ML microservice (ai-service, real trained Random Forest / Holt-Winters
   * models). Returns null on any failure (service down, timeout, non-200, malformed body) so
   * every caller can fall back to its existing deterministic rule-based computation - this ML
   * tier is strictly additive, never a hard dependency. */
  private async callAiService(
    path: string,
    companyId: number,
    timeoutMs = 5000,
  ): Promise<any | null> {
    const baseUrl = process.env.AI_SERVICE_URL;
    if (!baseUrl) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const separator = path.includes("?") ? "&" : "?";
      const res = await fetch(
        `${baseUrl}${path}${separator}company_id=${companyId}`,
        {
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      if (!res.ok) return null;
      const json = await res.json();
      if (json?.status !== "success") return null;
      return json.data;
    } catch {
      return null;
    }
  }

  /** Buckets raw `sales` rows into a { date -> totalRevenue } map for the last N days, for one
   * company. Scoped to `source: 'upload'` only, so financial KPIs/forecasts reflect real
   * uploaded sales data - never the fabricated demo rows the seed script inserts (those are
   * tagged `source: 'pos'` and have no `dataset_id`). */
  private async getDailyRevenue(companyId: number, daysBack: number) {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const sales = await this.prisma.sales.findMany({
      where: {
        company_id: companyId,
        transaction_date: { gte: since },
        source: "upload",
      },
      select: { transaction_date: true, total_amount: true },
    });

    const byDay = new Map<string, number>();
    for (let i = 0; i < daysBack; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (daysBack - 1 - i));
      byDay.set(dateKey(d), 0);
    }
    for (const s of sales) {
      const key = dateKey(new Date(s.transaction_date));
      byDay.set(key, (byDay.get(key) ?? 0) + s.total_amount);
    }
    return Array.from(byDay.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }

  /** Per-product quantity sold since a given date, for one company. */
  private async getQuantitySoldSince(companyId: number, since: Date) {
    const items = await this.prisma.sale_items.findMany({
      where: {
        sales: { company_id: companyId, transaction_date: { gte: since } },
      },
      select: { product_id: true, product_size_id: true, quantity: true },
    });
    const byProduct = new Map<number, number>();
    for (const it of items) {
      if (it.product_id == null) continue;
      byProduct.set(
        it.product_id,
        (byProduct.get(it.product_id) ?? 0) + it.quantity,
      );
    }
    return byProduct;
  }

  async forecast(companyId: number, daysAhead = 14) {
    const history = await this.getDailyRevenue(companyId, 90);
    const xs = history.map((_, i) => i);
    const ys = history.map((h) => h.revenue);
    const { slope, intercept, r2 } = linearRegression(xs, ys);

    // Tier 1: real Holt-Winters forecast from the Python ML service (trained on this
    // company's actual uploaded sales history). Tier 2: the linear-regression fallback below.
    const mlData = await this.callAiService("/ai/forecast", companyId);

    let forecastRows: {
      forecast_date: Date;
      predicted_revenue: number;
      confidence_score: number;
    }[];
    let usedMethod: string;

    if (mlData?.forecast?.length) {
      forecastRows = mlData.forecast.slice(0, daysAhead).map((row: any) => ({
        forecast_date: new Date(row.date),
        predicted_revenue: Math.round(row.predicted_revenue),
        confidence_score: Math.round(r2 * 100) / 100,
      }));
      usedMethod = "ml_holt_winters";
    } else {
      forecastRows = [];
      for (let i = 0; i < daysAhead; i++) {
        const dayIndex = xs.length + i;
        const predicted = Math.max(0, slope * dayIndex + intercept);
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        forecastRows.push({
          forecast_date: d,
          predicted_revenue: Math.round(predicted),
          confidence_score: Math.round(r2 * 100) / 100,
        });
      }
      usedMethod = "linear_regression_90d";
    }

    await this.prisma.$transaction(
      forecastRows.map((row) =>
        this.prisma.revenue_forecasts.create({
          data: {
            forecast_date: row.forecast_date,
            predicted_revenue: row.predicted_revenue,
            confidence_score: row.confidence_score,
            method: usedMethod,
            company_id: companyId,
          },
        }),
      ),
    );

    const movingAverage7d =
      history.slice(-7).reduce((s, h) => s + h.revenue, 0) /
      Math.min(7, history.length);

    return {
      method: usedMethod,
      history,
      forecast: forecastRows,
      moving_average_7d: Math.round(movingAverage7d),
      r_squared: Math.round(r2 * 100) / 100,
      trend: slope > 0 ? "up" : slope < 0 ? "down" : "flat",
    };
  }

  async demand(companyId: number, daysAhead = 14) {
    const now = new Date();
    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);
    const last14 = new Date(now);
    last14.setDate(last14.getDate() - 14);
    const prior14 = new Date(now);
    prior14.setDate(prior14.getDate() - 28);

    const [qtyLast30, qtyLast14, qtyPrior14] = await Promise.all([
      this.getQuantitySoldSince(companyId, last30),
      this.getQuantitySoldSince(companyId, last14),
      this.getQuantitySoldSince(companyId, prior14),
    ]);

    const products = await this.prisma.products.findMany({
      where: { company_id: companyId },
      select: { id: true, name: true },
    });

    // Tier 1: real Random Forest demand predictions from the Python ML service, summed per
    // product across sizes to match this endpoint's per-product granularity.
    const mlData = await this.callAiService("/ai/demand", companyId);
    const mlByProductName = new Map<string, number>();
    if (mlData?.predictions?.length) {
      for (const pred of mlData.predictions) {
        mlByProductName.set(
          pred.product,
          (mlByProductName.get(pred.product) ?? 0) +
            (pred.predicted_quantity ?? 0),
        );
      }
    }

    const results = products
      .map((p) => {
        const totalLast30 = qtyLast30.get(p.id) ?? 0;
        const avgPerDay = totalLast30 / 30;
        const recentAvg = (qtyLast14.get(p.id) ?? 0) / 14;
        const priorAvg =
          ((qtyPrior14.get(p.id) ?? 0) - (qtyLast14.get(p.id) ?? 0)) / 14;
        const trend =
          recentAvg > priorAvg * 1.1
            ? "rising"
            : recentAvg < priorAvg * 0.9
              ? "declining"
              : "stable";
        const mlProjected = mlByProductName.get(p.name);
        return {
          productId: p.id,
          productName: p.name,
          avgDailyDemand: Math.round(avgPerDay * 100) / 100,
          projectedDemand:
            mlProjected !== undefined
              ? Math.round(mlProjected)
              : Math.round(avgPerDay * daysAhead),
          trend,
        };
      })
      .filter((r) => r.avgDailyDemand > 0)
      .sort((a, b) => b.avgDailyDemand - a.avgDailyDemand);

    return {
      method:
        mlByProductName.size > 0 ? "ml_random_forest" : "moving_average_trend",
      daysAhead,
      data: results,
    };
  }

  async risk(companyId: number) {
    const sizes = await this.prisma.product_sizes.findMany({
      where: { products: { company_id: companyId } },
      include: { products: true },
    });

    // Tier 1: real Random-Forest-informed risk from the Python ML service.
    const mlData = await this.callAiService("/ai/risk", companyId);
    const mlAtRisk: any[] = (mlData?.products ?? []).filter(
      (item: any) => item.risk === "HIGH" || item.risk === "MEDIUM",
    );

    if (mlAtRisk.length > 0) {
      const sizeByKey = new Map(
        sizes.map((s) => [`${s.products?.name}::${s.size_name}`, s]),
      );

      const results = mlAtRisk
        .map((item) => {
          const s = sizeByKey.get(`${item.product}::${item.size}`);
          if (!s) return null;
          return {
            productId: s.product_id,
            productName: s.products?.name,
            sizeId: s.id,
            sizeName: s.size_name,
            currentStock: s.current_stock,
            minimumStock: s.minimum_stock,
            avgDailySales30d: item.predicted_daily_sales,
            daysToStockout: item.days_until_empty,
            severity: item.risk === "HIGH" ? "critical" : "warning",
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      results.sort(
        (a, b) => (a.daysToStockout ?? 9999) - (b.daysToStockout ?? 9999),
      );

      if (results.length > 0) {
        return { method: "ml_random_forest", data: results };
      }
    }

    // Tier 2: existing rule-based stock-velocity fallback.
    const atRisk = sizes.filter(
      (s) => (s.current_stock ?? 0) <= (s.minimum_stock ?? 10),
    );

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const results = await Promise.all(
      atRisk.map(async (s) => {
        const soldAgg = await this.prisma.sale_items.aggregate({
          where: {
            product_size_id: s.id,
            sales: { transaction_date: { gte: since30 } },
          },
          _sum: { quantity: true },
        });
        const soldLast30 = soldAgg._sum.quantity ?? 0;
        const velocityPerDay = soldLast30 / 30;
        const daysToStockout =
          velocityPerDay > 0
            ? Math.round((s.current_stock ?? 0) / velocityPerDay)
            : null;
        const severity =
          (s.current_stock ?? 0) === 0 ||
          (daysToStockout !== null && daysToStockout <= 3)
            ? "critical"
            : "warning";

        return {
          productId: s.product_id,
          productName: s.products?.name,
          sizeId: s.id,
          sizeName: s.size_name,
          currentStock: s.current_stock,
          minimumStock: s.minimum_stock,
          avgDailySales30d: Math.round(velocityPerDay * 100) / 100,
          daysToStockout,
          severity,
        };
      }),
    );

    results.sort(
      (a, b) => (a.daysToStockout ?? 9999) - (b.daysToStockout ?? 9999),
    );

    return { method: "rule_based_stock_velocity", data: results };
  }

  async promotion(companyId: number) {
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const qty = await this.getQuantitySoldSince(companyId, since30);

    const sizes = await this.prisma.product_sizes.findMany({
      where: { products: { company_id: companyId } },
      include: { products: true },
    });

    // Tier 1: real ML-composite promotion suggestions (demand + risk + basket-affinity score)
    // from the Python ML service.
    const mlData = await this.callAiService("/ai/promotion", companyId);
    if (mlData?.promotions?.length) {
      const sizeByKey = new Map(
        sizes.map((s) => [`${s.products?.name}::${s.size_name}`, s]),
      );

      const mlSuggestions = mlData.promotions
        .map((promo: any) => {
          const s = sizeByKey.get(`${promo.product}::${promo.size}`);
          if (!s || s.product_id == null) return null;
          const discountPercent =
            parseInt(String(promo.suggested_discount).replace("%", ""), 10) ||
            0;
          return {
            productId: s.product_id,
            productName: s.products?.name,
            sizeName: s.size_name,
            soldLast30d: qty.get(s.product_id) ?? 0,
            currentStock: s.current_stock,
            minimumStock: s.minimum_stock,
            reason: Array.isArray(promo.reason)
              ? promo.reason.join("; ")
              : String(promo.reason ?? ""),
            suggestedDiscountPercent: discountPercent,
          };
        })
        .filter((r: any): r is NonNullable<typeof r> => r !== null)
        .sort(
          (a: any, b: any) =>
            b.suggestedDiscountPercent - a.suggestedDiscountPercent,
        )
        .slice(0, 15);

      if (mlSuggestions.length > 0) {
        return {
          method: "ml_random_forest_basket_composite",
          data: mlSuggestions,
        };
      }
    }

    // Tier 2: existing slow-mover/overstock heuristic fallback.
    const sortedByQty = Array.from(qty.entries()).sort((a, b) => a[1] - b[1]);
    const slowMoverCount = Math.max(1, Math.ceil(sortedByQty.length * 0.25));
    const slowMoverIds = new Set(
      sortedByQty.slice(0, slowMoverCount).map(([id]) => id),
    );

    const suggestions: any[] = [];
    for (const s of sizes) {
      if (s.product_id == null) continue;
      const soldQty = qty.get(s.product_id) ?? 0;
      const stockRatio =
        (s.minimum_stock ?? 10) > 0
          ? (s.current_stock ?? 0) / (s.minimum_stock ?? 10)
          : 1;
      const isSlowMover = slowMoverIds.has(s.product_id);
      const isOverstocked = stockRatio >= 3;

      if (isSlowMover || isOverstocked) {
        let discount = 10;
        if (isSlowMover && isOverstocked) discount = 30;
        else if (isOverstocked) discount = 25;
        else if (isSlowMover) discount = 15;

        suggestions.push({
          productId: s.product_id,
          productName: s.products?.name,
          sizeName: s.size_name,
          soldLast30d: soldQty,
          currentStock: s.current_stock,
          minimumStock: s.minimum_stock,
          reason:
            isSlowMover && isOverstocked
              ? "slow_moving_and_overstocked"
              : isOverstocked
                ? "overstocked"
                : "slow_moving",
          suggestedDiscountPercent: discount,
        });
      }
    }

    suggestions.sort(
      (a, b) => b.suggestedDiscountPercent - a.suggestedDiscountPercent,
    );

    return {
      method: "rule_based_slow_mover_heuristic",
      data: suggestions.slice(0, 15),
    };
  }

  async recommendations(companyId: number) {
    const items = await this.prisma.sale_items.findMany({
      where: {
        sale_id: { not: null },
        product_id: { not: null },
        sales: { company_id: companyId },
      },
      select: { sale_id: true, product_id: true },
    });

    const bySale = new Map<number, Set<number>>();
    for (const it of items) {
      if (it.sale_id == null || it.product_id == null) continue;
      if (!bySale.has(it.sale_id)) bySale.set(it.sale_id, new Set());
      bySale.get(it.sale_id)!.add(it.product_id);
    }
    const totalBaskets = bySale.size || 1;

    // Tier 1: real Apriori association rules from the Python ML service. Only simple 1-to-1
    // rules are used here to match this endpoint's pairwise productA/productB contract.
    const mlData = await this.callAiService("/ai/basket", companyId);
    if (mlData?.rules?.length) {
      const simpleRules = mlData.rules.filter(
        (r: any) => r.buy?.length === 1 && r.recommend?.length === 1,
      );
      if (simpleRules.length > 0) {
        const pairs = simpleRules
          .map((r: any) => ({
            productA: r.buy[0],
            productB: r.recommend[0],
            coOccurrenceCount: Math.round((r.support ?? 0) * totalBaskets),
            lift: r.lift,
          }))
          .sort((a: any, b: any) => b.coOccurrenceCount - a.coOccurrenceCount)
          .slice(0, 10);
        return { method: "ml_apriori_basket", data: pairs };
      }
    }

    // Tier 2: existing in-memory co-occurrence/lift heuristic fallback.
    const pairCounts = new Map<string, number>();
    const singleCounts = new Map<number, number>();
    for (const productSet of bySale.values()) {
      const products = Array.from(productSet);
      for (const p of products)
        singleCounts.set(p, (singleCounts.get(p) ?? 0) + 1);
      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const [a, b] = [products[i], products[j]].sort((x, y) => x - y);
          const key = `${a}_${b}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    }

    const productNames = new Map(
      (
        await this.prisma.products.findMany({
          where: { company_id: companyId },
          select: { id: true, name: true },
        })
      ).map((p) => [p.id, p.name]),
    );

    const pairs = Array.from(pairCounts.entries())
      .map(([key, count]) => {
        const [aStr, bStr] = key.split("_");
        const a = Number(aStr);
        const b = Number(bStr);
        const expectedByChance =
          ((singleCounts.get(a) ?? 0) / totalBaskets) *
          ((singleCounts.get(b) ?? 0) / totalBaskets) *
          totalBaskets;
        const lift =
          expectedByChance > 0
            ? Math.round((count / expectedByChance) * 100) / 100
            : 0;
        return {
          productA: productNames.get(a),
          productB: productNames.get(b),
          coOccurrenceCount: count,
          lift,
        };
      })
      .sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount)
      .slice(0, 10);

    return { method: "market_basket_cooccurrence", data: pairs };
  }

  async insights(companyId: number) {
    const [riskResult, promoResult, demandResult, forecastResult] =
      await Promise.all([
        this.risk(companyId),
        this.promotion(companyId),
        this.demand(companyId),
        this.forecast(companyId),
      ]);

    const latestForecast = await this.prisma.revenue_forecasts.findFirst({
      where: { company_id: companyId },
      orderBy: { id: "desc" },
    });

    const created: any[] = [];

    const criticalRisks = riskResult.data
      .filter((r) => r.severity === "critical")
      .slice(0, 3);
    for (const r of criticalRisks) {
      const description =
        r.daysToStockout !== null
          ? `${r.productName} (${r.sizeName}) has ${r.currentStock} units left and is selling ~${r.avgDailySales30d}/day — projected to run out in ${r.daysToStockout} day(s).`
          : `${r.productName} (${r.sizeName}) has ${r.currentStock} units left, below its minimum of ${r.minimumStock}.`;
      created.push(
        await this.prisma.ai_insights.create({
          data: {
            title: `Critical stock risk: ${r.productName} (${r.sizeName})`,
            description,
            priority: "high",
            forecast_id: latestForecast?.id,
            company_id: companyId,
          },
        }),
      );
    }

    const topPromo = promoResult.data.slice(0, 2);
    for (const p of topPromo) {
      created.push(
        await this.prisma.ai_insights.create({
          data: {
            title: `Promotion opportunity: ${p.productName}`,
            description: `${p.productName} (${p.sizeName}) sold only ${p.soldLast30d} units in the last 30 days with ${p.currentStock} in stock. Consider a ${p.suggestedDiscountPercent}% discount (reason: ${p.reason}).`,
            priority: "medium",
            forecast_id: latestForecast?.id,
            company_id: companyId,
          },
        }),
      );
    }

    const risingDemand = demandResult.data
      .filter((d) => d.trend === "rising")
      .slice(0, 2);
    for (const d of risingDemand) {
      created.push(
        await this.prisma.ai_insights.create({
          data: {
            title: `Rising demand: ${d.productName}`,
            description: `${d.productName} demand is trending up, averaging ${d.avgDailyDemand} units/day recently (projected ${d.projectedDemand} over the next 14 days). Ensure stock keeps pace.`,
            priority: "medium",
            forecast_id: latestForecast?.id,
            company_id: companyId,
          },
        }),
      );
    }

    created.push(
      await this.prisma.ai_insights.create({
        data: {
          title: `Revenue trend: ${forecastResult.trend}`,
          description: `Based on a linear regression over the last 90 days (R²=${forecastResult.r_squared}), revenue is trending ${forecastResult.trend}. Next-day projection: ${forecastResult.forecast[0]?.predicted_revenue ?? 0}.`,
          priority: forecastResult.trend === "down" ? "high" : "low",
          forecast_id: latestForecast?.id,
          company_id: companyId,
        },
      }),
    );

    return { method: "rule_based_synthesis", data: created };
  }

  /** Cross-company portfolio snapshot for MAINTAINANCE - which partner companies are healthy vs struggling. */
  async portfolioOverview(companyIds: number[]) {
    const companies = await this.prisma.companies.findMany({
      where: { id: { in: companyIds } },
    });
    const rows = await Promise.all(
      companies.map(async (c) => {
        const since30 = new Date();
        since30.setDate(since30.getDate() - 30);
        const sincePrior30 = new Date();
        sincePrior30.setDate(sincePrior30.getDate() - 60);

        const [recent, prior, riskResult] = await Promise.all([
          this.prisma.sales.aggregate({
            where: { company_id: c.id, transaction_date: { gte: since30 } },
            _sum: { total_amount: true },
            _count: { id: true },
          }),
          this.prisma.sales.aggregate({
            where: {
              company_id: c.id,
              transaction_date: { gte: sincePrior30, lt: since30 },
            },
            _sum: { total_amount: true },
          }),
          this.risk(c.id),
        ]);

        const recentRevenue = recent._sum.total_amount ?? 0;
        const priorRevenue = prior._sum.total_amount ?? 0;
        const growthPercent =
          priorRevenue > 0
            ? Math.round(
                ((recentRevenue - priorRevenue) / priorRevenue) * 1000,
              ) / 10
            : null;
        const criticalCount = riskResult.data.filter(
          (r) => r.severity === "critical",
        ).length;

        return {
          companyId: c.id,
          companyName: c.name,
          partnershipStatus: c.partnership_status,
          revenueLast30d: recentRevenue,
          revenuePrior30d: priorRevenue,
          growthPercent,
          transactionsLast30d: recent._count.id,
          criticalStockItems: criticalCount,
          healthFlag:
            growthPercent !== null && growthPercent < -15
              ? "declining"
              : criticalCount > 3
                ? "at_risk"
                : "healthy",
        };
      }),
    );
    return { method: "cross_company_portfolio_snapshot", data: rows };
  }
}
