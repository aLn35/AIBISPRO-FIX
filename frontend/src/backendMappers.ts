/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Maps the real NestJS/Prisma backend's response shapes (now genuinely multi-company) onto
 * this app's existing frontend types (types.ts) so the existing dashboard components keep
 * working. All calls are scoped to a single real company id.
 */
import { apiGet } from "./api";
import { Product, Promotion, RevenueForecast, AiInsight, FinancialMetric, Company } from "./types";

export function mapCompany(raw: any): Company {
  return {
    id: String(raw.id),
    name: raw.name,
    type: raw.type ?? "",
    branches: raw.branches ?? 1,
    location: raw.location ?? "",
    description: raw.description ?? "",
    avatarUrl: raw.avatar_emoji ?? "🏢",
    partnershipStatus: raw.partnership_status ?? "active",
  };
}

function statusFor(stock: number, minStock: number): Product["status"] {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock <= minStock) return "LOW_STOCK";
  return "IN_STOCK";
}

function mapPromotionStatus(status: string | null | undefined): Promotion["status"] {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "ACTIVE";
    case "pending":
      return "PENDING_APPROVAL";
    case "expired":
      return "COMPLETED";
    case "rejected":
      return "REJECTED";
    default:
      return "PENDING_APPROVAL";
  }
}

function mapInsightType(priority: string | null | undefined): AiInsight["type"] {
  if (priority === "high") return "ALERT";
  if (priority === "low") return "SUCCESS";
  return "INFO";
}

export interface RealBackendData {
  products: Product[];
  promotions: Promotion[];
  forecasts: RevenueForecast[];
  insights: AiInsight[];
  metrics: FinancialMetric[];
}

/** Loads real, company-scoped data for exactly one company id (stringified backend id). */
export async function loadCompanyData(companyId: string): Promise<RealBackendData> {
  const qs = `?companyId=${companyId}`;
  const [rawProducts, rawPromotions, demandResp, forecastResp, insightsResp] = await Promise.all([
    apiGet(`/products${qs}`),
    apiGet(`/promotions${qs}`),
    apiGet(`/ai/demand${qs}`),
    apiGet(`/ai/forecast${qs}`),
    apiGet(`/ai/insights${qs}`),
  ]);

  const demandByProductId = new Map<number, number>();
  for (const d of demandResp.data ?? []) {
    demandByProductId.set(d.productId, d.projectedDemand ?? 0);
  }

  let totalPrice = 0;
  let totalCost = 0;
  for (const p of rawProducts) {
    for (const size of p.product_sizes ?? []) {
      totalPrice += size.selling_price ?? 0;
      totalCost += size.cost_price ?? 0;
    }
  }
  const cogsRatio = totalPrice > 0 ? totalCost / totalPrice : 0.4;

  let realInventoryValue = 0;
  for (const p of rawProducts) {
    for (const size of p.product_sizes ?? []) {
      realInventoryValue += (size.current_stock ?? 0) * (size.cost_price ?? 0);
    }
  }

  const products: Product[] = [];
  const promotions: Promotion[] = [];
  const forecasts: RevenueForecast[] = [];
  const insights: AiInsight[] = [];
  const metrics: FinancialMetric[] = [];

  const forecastData = forecastResp.data;
  const next7DaysRevenue = (forecastData.forecast ?? []).slice(0, 7).reduce((s: number, f: any) => s + f.predicted_revenue, 0);
  const monthlyProjection = Math.round((next7DaysRevenue / 7) * 30);
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  for (const p of rawProducts) {
    for (const size of p.product_sizes ?? []) {
      const stock = size.current_stock ?? 0;
      const minStock = size.minimum_stock ?? 10;
      products.push({
        id: `${companyId}_size_${size.id}`,
        companyId,
        productId: p.id,
        sizeId: size.id,
        sizeName: size.size_name,
        name: p.product_sizes.length > 1 ? `${p.name} (${size.size_name})` : p.name,
        category: p.categories?.name ?? "Uncategorized",
        price: size.selling_price ?? 0,
        cogs: size.cost_price ?? 0,
        stock,
        minStock,
        status: statusFor(stock, minStock),
        salesCount: demandByProductId.get(p.id) ?? 0,
      });
    }
  }

  for (const promo of rawPromotions) {
    promotions.push({
      id: `${companyId}_promo_${promo.id}`,
      companyId,
      name: promo.title,
      type: "DISCOUNT",
      discountPercent: promo.discount_percent ?? undefined,
      startDate: promo.start_date ? String(promo.start_date).slice(0, 10) : "",
      endDate: promo.end_date ? String(promo.end_date).slice(0, 10) : "",
      status: mapPromotionStatus(promo.status),
      conversionRate: 0,
      revenueGenerated: 0,
      description: promo.description ?? undefined,
      imageUrl: promo.image_url ?? undefined,
    });
  }

  forecasts.push({
    id: `${companyId}_forecast`,
    companyId,
    targetMonth,
    forecastedRevenue: monthlyProjection,
    confidenceScore: Math.round((forecastData.r_squared ?? 0) * 100),
    keyDrivers: [
      `Revenue trend: ${forecastData.trend} (linear regression over 90 days of real sales)`,
      `Model fit R²: ${forecastData.r_squared}`,
      `7-day moving average: Rp ${Math.round(forecastData.moving_average_7d ?? 0).toLocaleString("id-ID")}`,
    ],
  });

  for (const insight of insightsResp.data ?? []) {
    insights.push({
      id: `${companyId}_insight_${insight.id}`,
      companyId,
      title: insight.title,
      summary: insight.description,
      details: insight.description,
      recommendations: [],
      type: mapInsightType(insight.priority),
      date: insight.generated_at ? String(insight.generated_at).slice(0, 10) : now.toISOString().slice(0, 10),
    });
  }

  for (const day of forecastData.history ?? []) {
    const revenue = day.revenue ?? 0;
    const cogs = Math.round(revenue * cogsRatio);
    const expenses = Math.round(revenue * 0.15);
    const profit = revenue - cogs - expenses;
    metrics.push({
      id: `${companyId}_metric_${day.date}`,
      companyId,
      date: day.date,
      revenue,
      expenses,
      cogs,
      profit,
      cashFlow: profit,
      inventoryValue: realInventoryValue,
    });
  }

  return { products, promotions, forecasts, insights, metrics };
}

/** Merges per-company RealBackendData results into one combined set (for multi-company views like MAINTAINANCE portfolio or an OWNER with several companies). */
export async function loadMultiCompanyData(companyIds: string[]): Promise<RealBackendData> {
  const results = await Promise.all(companyIds.map((id) => loadCompanyData(id)));
  return {
    products: results.flatMap((r) => r.products),
    promotions: results.flatMap((r) => r.promotions),
    forecasts: results.flatMap((r) => r.forecasts),
    insights: results.flatMap((r) => r.insights),
    metrics: results.flatMap((r) => r.metrics),
  };
}

/**
 * Loads only the public, unauthenticated slice of company data (products + promotions) for
 * guest CUSTOMER browsing. Skips /ai/* endpoints entirely since those are JWT-guarded and a
 * guest has no access token.
 */
export async function loadPublicMenuData(companyIds: string[]): Promise<RealBackendData> {
  const perCompany = await Promise.all(
    companyIds.map(async (companyId) => {
      const qs = `?companyId=${companyId}`;
      const [rawProducts, rawPromotions] = await Promise.all([
        apiGet(`/products${qs}`),
        apiGet(`/promotions${qs}`),
      ]);

      const products: Product[] = [];
      for (const p of rawProducts) {
        for (const size of p.product_sizes ?? []) {
          const stock = size.current_stock ?? 0;
          const minStock = size.minimum_stock ?? 10;
          products.push({
            id: `${companyId}_size_${size.id}`,
            companyId,
            productId: p.id,
            sizeId: size.id,
            sizeName: size.size_name,
            name: p.product_sizes.length > 1 ? `${p.name} (${size.size_name})` : p.name,
            category: p.categories?.name ?? "Uncategorized",
            price: size.selling_price ?? 0,
            cogs: size.cost_price ?? 0,
            stock,
            minStock,
            status: statusFor(stock, minStock),
            salesCount: 0,
          });
        }
      }

      const promotions: Promotion[] = [];
      for (const promo of rawPromotions) {
        promotions.push({
          id: `${companyId}_promo_${promo.id}`,
          companyId,
          name: promo.title,
          type: "DISCOUNT",
          discountPercent: promo.discount_percent ?? undefined,
          startDate: promo.start_date ? String(promo.start_date).slice(0, 10) : "",
          endDate: promo.end_date ? String(promo.end_date).slice(0, 10) : "",
          status: mapPromotionStatus(promo.status),
          conversionRate: 0,
          revenueGenerated: 0,
          description: promo.description ?? undefined,
          imageUrl: promo.image_url ?? undefined,
        });
      }

      return { products, promotions };
    }),
  );

  return {
    products: perCompany.flatMap((r) => r.products),
    promotions: perCompany.flatMap((r) => r.promotions),
    forecasts: [],
    insights: [],
    metrics: [],
  };
}
