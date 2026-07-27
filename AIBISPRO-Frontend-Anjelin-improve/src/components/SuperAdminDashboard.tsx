/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from "react";
import { Company, FinancialMetric, Currency, Product, Promotion, User } from "../types";
import { PRESET_COMPANIES, DEMO_USERS, EXCHANGE_RATE } from "../mockData";
import { apiGet } from "../api";
import InboxThread from "./InboxThread";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ShieldAlert,
  Server,
  Users,
  Activity,
  Cpu,
  HardDrive,
  Network,
  CreditCard,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Percent,
  Sparkles,
  ClipboardList,
  ArrowUpRight,
  Gauge,
  UtensilsCrossed,
  Tag,
  Boxes,
} from "lucide-react";

interface SuperAdminDashboardProps {
  currentUser: User;
  companies: Company[];
  products: Product[];
  promotions: Promotion[];
  metrics: FinancialMetric[];
  currency: Currency;
  onSwitchCompany: (company: Company) => void;
  onChangeView: (view: string) => void;
}

type ConsultantTab = "CLIENTS" | "DEEP_DIVE" | "HEALTH_CENTER" | "BENCHMARK" | "AI_HUB";

interface BundleProposal {
  id: string;
  companyId: string;
  name: string;
  productNames: string[];
  regularPrice: number;
  bundlePrice: number;
  strategy: string;
  status: "pending" | "approved" | "rejected";
  submittedTime: string;
}

const BENCHMARK_DETAILS: { [key in "food" | "waste" | "margin"]: { trend: string; actions: string[] } } = {
  food: {
    trend: "Food cost has drifted 0.5pt above the SEA F&B benchmark over the last 3 reporting cycles, mainly driven by imported dairy pricing.",
    actions: [
      "Renegotiate supplier contract terms for high-volume dairy and bean lines.",
      "Tighten portion control standards across peak-hour recipes.",
      "Review the menu mix to favor higher-margin items in promotions."
    ]
  },
  waste: {
    trend: "Ingredient waste has remained above the 5% target band for two consecutive months, concentrated in perishable dairy and produce categories.",
    actions: [
      "Tighten demand forecasting to align prep quantities with actual sales patterns.",
      "Introduce daily waste logging at branch level for early detection.",
      "Coordinate with the supplier on smaller, more frequent delivery batches."
    ]
  },
  margin: {
    trend: "Gross margin has held steady above the regional benchmark, supported by disciplined COGS management and stable pricing.",
    actions: [
      "Maintain current supplier terms and pricing discipline.",
      "Explore controlled menu price increases on high-demand items.",
      "Reinvest margin gains into targeted marketing campaigns."
    ]
  }
};

interface ForecastCard {
  id: string;
  tag: string;
  reliability: number;
  title: string;
  summary: string;
  action: string;
  impact: string;
  dataPoints: string[];
  nextSteps: string[];
}

function humanizeReason(reason: string): string {
  return reason.replace(/_/g, " ");
}

/** Builds real, per-company forecast cards from live risk/promotion/demand/basket analytics -
 * replaces what used to be 2 hardcoded generic demo insights with actual sales-driven data. */
function buildForecastCards(
  risk: any[],
  promo: any[],
  demand: any[],
  recs: any[],
): ForecastCard[] {
  const cards: ForecastCard[] = [];

  for (const r of risk.filter((x) => x.severity === "critical").slice(0, 3)) {
    const reliability = r.daysToStockout !== null ? Math.min(99, 70 + (30 - Math.min(30, r.daysToStockout))) : 72;
    cards.push({
      id: `risk-${r.sizeId}`,
      tag: "Demand Prediction",
      reliability,
      title: `Restock trigger: ${r.productName} (${r.sizeName})`,
      summary:
        r.daysToStockout !== null
          ? `Selling ~${r.avgDailySales30d} units/day with only ${r.currentStock} left (minimum threshold ${r.minimumStock}). Projected to run out in ${r.daysToStockout} day(s).`
          : `Only ${r.currentStock} units left, below the minimum threshold of ${r.minimumStock}, with negligible recent sales velocity to project a stockout date.`,
      action: "Restock purchase order",
      impact:
        r.daysToStockout !== null
          ? `Prevents a stockout within the next ${r.daysToStockout} day(s) at the current sell-through rate.`
          : `Restores buffer above the ${r.minimumStock}-unit safety threshold.`,
      dataPoints: [
        `Current stock: ${r.currentStock} units (minimum: ${r.minimumStock})`,
        `Average daily sales (last 30d): ${r.avgDailySales30d} units`,
        r.daysToStockout !== null ? `Estimated days to stockout: ${r.daysToStockout}` : "Sales velocity too low to estimate a stockout date",
      ],
      nextSteps: [
        `Submit a restock purchase order for ${r.productName} (${r.sizeName})`,
        "Confirm vendor delivery lead time against the projected stockout date",
        "Review the safety stock threshold with the branch manager",
      ],
    });
  }

  for (const p of promo.slice(0, 3)) {
    cards.push({
      id: `promo-${p.productId}-${p.sizeName}`,
      tag: "Promo Campaign ROI",
      reliability: Math.min(97, 60 + p.suggestedDiscountPercent),
      title: `Discount opportunity: ${p.productName}`,
      summary: `${p.productName} (${p.sizeName}) sold only ${p.soldLast30d} units in the last 30 days against ${p.currentStock} in stock (${humanizeReason(p.reason)}). A ${p.suggestedDiscountPercent}% discount could accelerate sell-through.`,
      action: `Launch ${p.suggestedDiscountPercent}% discount campaign`,
      impact: `Reduces ${humanizeReason(p.reason)} inventory risk for ${p.productName}.`,
      dataPoints: [
        `Units sold (last 30d): ${p.soldLast30d}`,
        `Current stock: ${p.currentStock} (minimum: ${p.minimumStock})`,
        `Classification: ${humanizeReason(p.reason)}`,
      ],
      nextSteps: [
        "Draft the discount campaign proposal for Owner review",
        "Coordinate with Manager to publish the promo in the catalog",
        "Track conversion for 2 weeks post-launch and report back",
      ],
    });
  }

  for (const pair of recs.filter((x) => x.lift > 1).slice(0, 2)) {
    cards.push({
      id: `bundle-${pair.productA}-${pair.productB}`,
      tag: "Promo Campaign ROI",
      reliability: Math.min(98, Math.round(pair.lift * 30)),
      title: `Bundle opportunity: ${pair.productA} + ${pair.productB}`,
      summary: `${pair.productA} and ${pair.productB} are bought together ${pair.coOccurrenceCount} time(s) - ${pair.lift}x more often than random chance predicts. Bundling both as a combo could capture this pairing.`,
      action: "Publish bundle menu item",
      impact: `Co-occurrence lift of ${pair.lift}x suggests a strong cross-sell opportunity.`,
      dataPoints: [
        `Co-occurrence count: ${pair.coOccurrenceCount} baskets`,
        `Lift score: ${pair.lift}x random chance`,
      ],
      nextSteps: [
        "Draft the combo pricing proposal for Owner review",
        "Coordinate with Manager to publish the bundle in the product catalog",
        "Track conversion for 2 weeks post-launch and report back",
      ],
    });
  }

  for (const d of demand.filter((x) => x.trend === "rising").slice(0, 2)) {
    cards.push({
      id: `demand-${d.productId}`,
      tag: "Demand Prediction",
      reliability: 85,
      title: `Rising demand: ${d.productName}`,
      summary: `${d.productName} demand is trending up, averaging ${d.avgDailyDemand} units/day recently, projected at ${d.projectedDemand} units over the next 14 days.`,
      action: "Increase stock allocation",
      impact: "Ensures supply keeps pace with a rising demand trend before it turns into a stockout risk.",
      dataPoints: [
        `Average daily demand: ${d.avgDailyDemand} units`,
        `Projected 14-day demand: ${d.projectedDemand} units`,
        `Trend: ${d.trend}`,
      ],
      nextSteps: [
        "Increase reorder quantity for the next purchase cycle",
        "Monitor stock levels closely over the next 2 weeks",
      ],
    });
  }

  return cards.sort((a, b) => b.reliability - a.reliability);
}

export default function SuperAdminDashboard({
  currentUser,
  companies,
  products,
  promotions,
  metrics,
  currency,
  onSwitchCompany,
  onChangeView,
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<ConsultantTab>("CLIENTS");
  const [selectedCompany, setSelectedCompany] = useState<Company>(companies[0] || PRESET_COMPANIES[0]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<"food" | "waste" | "margin">("food");
  const [showInsightDetail, setShowInsightDetail] = useState(false);
  const [expandedForecastId, setExpandedForecastId] = useState<string | null>(null);

  // companies loads asynchronously (real backend fetch) after mount - once it arrives, default
  // the selection to the first real company if the current one isn't in the list anymore.
  useEffect(() => {
    if (companies.length === 0) return;
    const stillValid = companies.some((c) => c.id === selectedCompany.id);
    if (!stillValid) setSelectedCompany(companies[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies]);

  // Real cross-company revenue growth/critical-stock snapshot from the backend (replaces
  // guesswork) - keyed by stringified company id.
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<Record<string, { growthPercent: number | null; transactionsLast30d: number; criticalStockItems: number; healthFlag: string }>>({});
  useEffect(() => {
    apiGet("/ai/portfolio")
      .then((res) => {
        const map: Record<string, any> = {};
        for (const row of res.data ?? []) {
          map[String(row.companyId)] = row;
        }
        setPortfolioSnapshot(map);
      })
      .catch((e) => console.error("Failed to load portfolio snapshot:", e));
  }, [companies]);

  // Real forecast/consult cards for the selected company, built from live risk/promotion/demand/
  // basket-analysis endpoints (replaces the previous 2 hardcoded demo insights).
  const [forecastCards, setForecastCards] = useState<ForecastCard[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  useEffect(() => {
    if (!selectedCompany?.id) return;
    setForecastLoading(true);
    Promise.all([
      apiGet(`/ai/risk?companyId=${selectedCompany.id}`),
      apiGet(`/ai/promotion?companyId=${selectedCompany.id}`),
      apiGet(`/ai/demand?companyId=${selectedCompany.id}`),
      apiGet(`/ai/recommendations?companyId=${selectedCompany.id}`),
    ])
      .then(([risk, promo, demand, recs]) => {
        setForecastCards(buildForecastCards(risk.data ?? [], promo.data ?? [], demand.data ?? [], recs.data ?? []));
      })
      .catch((e) => {
        console.error("Failed to load forecast consult data:", e);
        setForecastCards([]);
      })
      .finally(() => setForecastLoading(false));
  }, [selectedCompany?.id]);

  // Combo bundle proposals for the selected company, from the real backend.
  const [bundleProposals, setBundleProposals] = useState<BundleProposal[]>([]);
  useEffect(() => {
    if (!selectedCompany?.id) return;
    apiGet(`/bundle-proposals?companyId=${selectedCompany.id}`)
      .then((rows: any[]) =>
        setBundleProposals(
          rows.map((b) => ({
            id: String(b.id),
            companyId: String(b.company_id),
            name: b.name,
            productNames: b.product_names ?? [],
            regularPrice: b.regular_price,
            bundlePrice: b.bundle_price,
            strategy: b.strategy ?? "",
            status: b.status,
            submittedTime: b.created_at,
          }))
        )
      )
      .catch((e) => console.error("Failed to load bundle proposals:", e));
  }, [selectedCompany.id]);


  // Local state for permissions per company
  const [consultantAccess, setConsultantAccess] = useState<{ [companyId: string]: any }>({});

  // Sync access permissions with localStorage
  useEffect(() => {
    const accessMap: { [companyId: string]: any } = {};
    companies.forEach((c) => {
      const stored = localStorage.getItem(`aibispro_consultant_access_${c.id}`);
      if (stored) {
        try {
          accessMap[c.id] = JSON.parse(stored);
        } catch (e) {
          accessMap[c.id] = { analytics: true, inventory: true, expenses: false, capital: false, employee: false };
        }
      } else {
        // Default initial settings
        accessMap[c.id] = {
          analytics: true,
          inventory: true,
          expenses: c.id === "abc_coffee" ? true : false, // let's default abc_coffee to true for demo, others false
          capital: false,
          employee: false
        };
      }
    });
    setConsultantAccess(accessMap);
  }, [companies]);

  // Local state for interactive To-Do Checklist (Consultant tasks)
  const [todos, setTodos] = useState<{ id: string; text: string; completed: boolean; category: string }[]>(() => {
    const stored = localStorage.getItem("aibispro_consultant_todos");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return [
      { id: "todo-1", text: "Validate ABC Coffee's newly uploaded CSV sales ledger dataset", completed: true, category: "DATA_VALIDATION" },
      { id: "todo-2", text: "Investigate Wagyu Prime Bistro's warning-level ingredient waste (11.8%)", completed: false, category: "HEALTH_AUDIT" },
      { id: "todo-3", text: "Formulate high-margin Croissant Combo recommendation for ABC Coffee", completed: false, category: "STRATEGY_CONSULT" },
      { id: "todo-4", text: "Check Sushi House's operating margins against SEA average benchmarks", completed: true, category: "BENCHMARKING" },
      { id: "todo-5", text: "Confirm Owner permissions for financial cost analysis visibility", completed: false, category: "SECURITY_GATEWAY" },
      { id: "todo-6", text: "Submit updated revenue forecast prediction results to client meeting logs", completed: false, category: "AI_FORECAST" },
    ];
  });

  useEffect(() => {
    localStorage.setItem("aibispro_consultant_todos", JSON.stringify(todos));
  }, [todos]);

  const toggleTodo = (id: string) => {
    setTodos(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      return updated;
    });
  };

  const completedCount = todos.filter(t => t.completed).length;
  const completionPercentage = Math.round((completedCount / todos.length) * 100);

  // Currency helper
  const formatValue = (amount: number) => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(amount / EXCHANGE_RATE);
    } else {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount);
    }
  };

  // Pre-calculate cumulative platform statistics
  const platformStats = useMemo(() => {
    let globalRevenue = 0;
    let globalExpenses = 0;
    let globalCogs = 0;

    metrics.forEach((m) => {
      globalRevenue += m.revenue;
      globalExpenses += m.expenses;
      globalCogs += m.cogs;
    });

    const companyRevs: { [key: string]: number } = {};
    metrics.forEach((m) => {
      if (!companyRevs[m.companyId]) {
        companyRevs[m.companyId] = 0;
      }
      companyRevs[m.companyId] += m.revenue;
    });

    return {
      globalRevenue,
      globalExpenses,
      globalProfit: globalRevenue - globalCogs - globalExpenses,
      companyRevs,
    };
  }, [metrics]);

  // Calculate dynamic parameters for each company to form Health Scores
  const companyHealthData = useMemo(() => {
    return companies.map((c) => {
      const compMetrics = metrics.filter((m) => m.companyId === c.id);
      const totalRev = compMetrics.reduce((sum, m) => sum + m.revenue, 0);
      const totalExp = compMetrics.reduce((sum, m) => sum + m.expenses, 0);
      const totalCogs = compMetrics.reduce((sum, m) => sum + m.cogs, 0);
      const profit = totalRev - totalCogs - totalExp;

      // growth rates & margins - real cross-company revenue growth from /ai/portfolio
      // (last-30-days vs prior-30-days), not a per-id guess.
      const snapshot = portfolioSnapshot[c.id];
      const profitMargin = totalRev > 0 ? (profit / totalRev) * 100 : 0;
      const revGrowth = snapshot?.growthPercent ?? 0;
      const criticalStockItems = snapshot?.criticalStockItems ?? 0;
      // Waste/inventory-turnover tracking isn't modeled in the schema yet, so these stay as a
      // flat industry-average placeholder rather than fabricated per-company numbers.
      const wastePct = 5.5;
      const inventoryTurnover = 6.1;

      // health score: weighted parameters
      let healthScore = 75; // base
      if (snapshot) {
        if (revGrowth > 0) healthScore += 10; else healthScore -= 15;
      }
      if (profitMargin > 20) healthScore += 10; else if (profitMargin < 10) healthScore -= 10;
      if (criticalStockItems > 3) healthScore -= 12; else healthScore += 5;

      // clamp to 0-100
      healthScore = Math.max(10, Math.min(100, healthScore));

      return {
        company: c,
        healthScore,
        revenue: totalRev,
        profit,
        profitMargin,
        revGrowth,
        criticalStockItems,
        wastePct,
        inventoryTurnover,
        status: healthScore >= 80 ? "EXCELLENT" : healthScore >= 60 ? "STABLE" : "WARNING"
      };
    });
  }, [companies, metrics, portfolioSnapshot]);

  // Deep-dive data for the currently selected company: real menu, promotions, and revenue trend.
  const companyProducts = useMemo(
    () => products.filter((p) => p.companyId === selectedCompany.id).sort((a, b) => b.salesCount - a.salesCount),
    [products, selectedCompany.id],
  );
  const companyPromotions = useMemo(
    () => promotions.filter((p) => p.companyId === selectedCompany.id),
    [promotions, selectedCompany.id],
  );
  const companyRevenueTrend = useMemo(
    () =>
      metrics
        .filter((m) => m.companyId === selectedCompany.id)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30)
        .map((m) => ({ date: m.date.slice(5), revenue: m.revenue })),
    [metrics, selectedCompany.id],
  );

  // Handle active workspace switching
  const handleSelectWorkspace = (c: Company) => {
    setSelectedCompany(c);
  };

  const currentAccess = consultantAccess[selectedCompany.id] || {
    analytics: true,
    inventory: true,
    expenses: false,
    capital: false,
    employee: false,
    maintenance: true
  };

  const isMaintenanceAllowed = currentAccess.hasOwnProperty("maintenance") ? (currentAccess as any).maintenance !== false : true;

  const activeHealth = companyHealthData.find(hd => hd.company.id === selectedCompany.id) || {
    healthScore: 82,
    revGrowth: 14.5,
    profitMargin: 24.2,
    inventoryTurnover: 8.4,
    wastePct: 4.2,
    revenue: 55000000,
    profit: 14000000
  };

  // Mock server nodes stats
  const serverNodes = [
    { name: "Indonesia Main API Node-1 (Jakarta)", status: "HEALTHY", cpu: "14%", ram: "4.2 GB / 8.0 GB", latency: "12ms" },
    { name: "AIBISPRO Global Core VM (Cloud Run)", status: "HEALTHY", cpu: "22%", ram: "3.5 GB / 16.0 GB", latency: "8ms" }
  ];

  return (
    <div className="space-y-6">
      
      {/* Salesforce Consultant Welcome Banner */}
      <div className="bg-slate-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,rgba(38,28,193,0.3),transparent)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#261CC1] text-white font-mono tracking-wider">
                Salesforce Consultant Workspace
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#F1FF5E] text-slate-900 font-mono tracking-wider animate-pulse">
                MAINTENANCE & BENCHMARKING ACTIVE
              </span>
            </div>
            <h2 className="text-xl font-display font-extrabold mt-1.5">AIBISPRO Consultant CRM Command Suite</h2>
            <p className="text-xs text-slate-400">Validate dataset health parameters, benchmark corporate structures with F&B averages, and consult client business strategies.</p>
          </div>
          
          {/* Company quick switch widget */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-2 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 pl-2">Client Focus:</span>
            <select
              value={selectedCompany.id}
              onChange={(e) => {
                const comp = companies.find(c => c.id === e.target.value);
                if (comp) handleSelectWorkspace(comp);
              }}
              className="bg-slate-950 text-white border border-slate-800 text-xs py-1.5 px-3 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#261CC1]"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.avatarUrl} {c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Modular Tab Switcher */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("CLIENTS")}
          className={`pb-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "CLIENTS"
              ? "border-[#261CC1] text-[#261CC1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Client Profile Directory</span>
        </button>

        <button
          onClick={() => setActiveTab("DEEP_DIVE")}
          className={`pb-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "DEEP_DIVE"
              ? "border-[#261CC1] text-[#261CC1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Company Deep-Dive</span>
        </button>

        <button
          onClick={() => setActiveTab("HEALTH_CENTER")}
          className={`pb-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "HEALTH_CENTER"
              ? "border-[#261CC1] text-[#261CC1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Company Health Center</span>
        </button>

        <button
          onClick={() => setActiveTab("BENCHMARK")}
          className={`pb-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "BENCHMARK"
              ? "border-[#261CC1] text-[#261CC1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>F&B Benchmark Center</span>
        </button>

        <button
          onClick={() => setActiveTab("AI_HUB")}
          className={`pb-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "AI_HUB"
              ? "border-[#261CC1] text-[#261CC1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Forecast Consult Hub</span>
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="mt-2">
        
        {/* TAB 1: CLIENTS PROFILE DIRECTORY */}
        {activeTab === "CLIENTS" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: client lists & switcher */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">Workspace Client Directory</h3>
                <p className="text-xs text-slate-500">List of active F&B client portfolios synchronized to AIBISPRO platform.</p>
              </div>

              <div className="space-y-3">
                {companyHealthData.map(({ company: c, healthScore, revenue, status }) => {
                  const isSelected = selectedCompany.id === c.id;
                  const access = consultantAccess[c.id] || { analytics: true, expenses: false };

                  return (
                    <div 
                      key={c.id} 
                      onClick={() => handleSelectWorkspace(c)}
                      className={`p-4 border rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                        isSelected 
                          ? "border-[#261CC1] bg-indigo-50/10 shadow-sm" 
                          : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm shrink-0">{c.avatarUrl}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            {c.name}
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#261CC1] animate-ping"></span>}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{c.type} • {c.branches} Branches</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Score</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-sm font-black font-mono ${
                              status === "EXCELLENT" ? "text-emerald-600" : status === "STABLE" ? "text-amber-500" : "text-rose-600"
                            }`}>{healthScore}/100</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                              status === "EXCELLENT" ? "bg-emerald-50 text-emerald-700" : status === "STABLE" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700 animate-pulse"
                            }`}>{status}</span>
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Scope</p>
                          <div className="flex gap-1 mt-1">
                            <span className="px-1 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-mono font-bold rounded uppercase">ANL</span>
                            <span className="px-1 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-mono font-bold rounded uppercase">INV</span>
                            <span className={`px-1 py-0.5 text-[8px] font-mono font-bold rounded uppercase ${
                              access.expenses ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                            }`}>EXP</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSwitchCompany(c);
                            onChangeView("DASHBOARD");
                          }}
                          className="bg-[#261CC1] hover:bg-[#1C0770] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow cursor-pointer text-center"
                        >
                          Access Workspace
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col: Monitored Workspace state & sensitive permissions indicators */}
            <div className="space-y-6">
              {/* Client Access State Badge Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <ShieldAlert className="w-5 h-5 text-indigo-700" />
                  Access Authorizations
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  These authorization bounds are strictly controlled by <span className="font-extrabold text-slate-700">{selectedCompany.name}'s Owner</span>. Access to sensitive financials is restricted by default.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Unlock className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-700">Analytics & Inventories</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">GRANTED</span>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      {currentAccess.expenses ? (
                        <Unlock className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-rose-500" />
                      )}
                      <span className="text-xs font-bold text-slate-700">Supplier Cost Details</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentAccess.expenses ? "text-emerald-600 bg-emerald-50" : "text-rose-500 bg-rose-50"
                    }`}>{currentAccess.expenses ? "GRANTED" : "LOCKED"}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      {currentAccess.capital ? (
                        <Unlock className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-rose-500" />
                      )}
                      <span className="text-xs font-bold text-slate-700">Bank Account & Capital</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentAccess.capital ? "text-emerald-600 bg-emerald-50" : "text-rose-500 bg-rose-50"
                    }`}>{currentAccess.capital ? "GRANTED" : "LOCKED"}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      {currentAccess.employee ? (
                        <Unlock className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-rose-500" />
                      )}
                      <span className="text-xs font-bold text-slate-700">Employee & Crew Rosters</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentAccess.employee ? "text-emerald-600 bg-emerald-50" : "text-rose-500 bg-rose-50"
                    }`}>{currentAccess.employee ? "GRANTED" : "LOCKED"}</span>
                  </div>
                </div>
              </div>

              {/* Consultant Task Checklist */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                    <ClipboardList className="w-5 h-5 text-[#261CC1]" />
                    Consultant Task Checklist
                  </h4>
                  <span className="text-[11px] font-mono font-black text-[#261CC1] bg-indigo-50 px-2 py-0.5 rounded-full">
                    {completionPercentage}% Done
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Track and tick off active implementation, auditing, and optimization tasks for client accounts.
                </p>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>Progress</span>
                    <span>{completedCount} / {todos.length} completed</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-[#261CC1] transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Checklist List */}
                <div className="space-y-2 text-xs pt-2">
                  {todos.map((todo) => (
                    <div 
                      key={todo.id} 
                      onClick={() => toggleTodo(todo.id)}
                      className={`p-3 border rounded-xl flex items-start gap-2.5 transition-all cursor-pointer ${
                        todo.completed 
                          ? "bg-slate-50 border-slate-100 text-slate-400 animate-fade-in" 
                          : "bg-white border-slate-200 text-slate-700 hover:border-[#261CC1] hover:bg-slate-50/20"
                      }`}
                    >
                      <button className="focus:outline-none mt-0.5 shrink-0" type="button">
                        {todo.completed ? (
                          <CheckCircle className="w-4 h-4 text-[#261CC1]" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 rounded-md hover:border-[#261CC1]"></div>
                        )}
                      </button>
                      <div className="flex-1">
                        <p className={`text-[11px] font-bold leading-tight ${todo.completed ? "line-through text-slate-400 font-medium" : "text-slate-800"}`}>
                          {todo.text}
                        </p>
                        <span className={`text-[8px] font-mono font-black uppercase tracking-wider mt-1 inline-block px-1.5 py-0.5 rounded ${
                          todo.completed 
                            ? "bg-slate-200 text-slate-500" 
                            : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {todo.category.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1B: COMPANY DEEP-DIVE (MENU, PROMOTIONS, BUNDLES, RECOMMENDATIONS) */}
        {activeTab === "DEEP_DIVE" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left/Center: revenue trend + menu + promotions + bundles */}
            <div className="xl:col-span-2 space-y-6">
              {/* Revenue Trend Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#261CC1]" />
                      {selectedCompany.name} - Revenue Trend
                    </h3>
                    <p className="text-xs text-slate-500">Real daily revenue from ingested sales data.</p>
                  </div>
                  <span className="text-lg font-black text-slate-900 font-mono">{formatValue(activeHealth.revenue)}</span>
                </div>
                <div className="h-56 mt-2">
                  {companyRevenueTrend.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                      No sales data ingested yet for this company.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={companyRevenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="deepDiveRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#261CC1" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#261CC1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <Tooltip formatter={(v: number) => formatValue(v)} />
                        <Area type="monotone" dataKey="revenue" stroke="#261CC1" strokeWidth={2} fill="url(#deepDiveRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Menu Snapshot */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-[#261CC1]" />
                  Menu Snapshot ({companyProducts.length} items)
                </h3>
                {companyProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold">No menu items catalogued yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {companyProducts.slice(0, 8).map((p) => (
                      <div key={p.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">{p.category} &bull; Sold {p.salesCount}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-black text-slate-800">{formatValue(p.price)}</p>
                          <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                            p.status === "OUT_OF_STOCK" ? "bg-rose-50 text-rose-600" : p.status === "LOW_STOCK" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                          }`}>
                            {p.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Promotions + Bundles side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <h3 className="font-display font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#261CC1]" />
                    Promotions ({companyPromotions.length})
                  </h3>
                  {companyPromotions.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold">No promotions on record.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {companyPromotions.map((promo) => (
                        <div key={promo.id} className="p-2.5 border border-slate-100 rounded-xl bg-slate-50/50">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold text-slate-800 truncate">{promo.name}</p>
                            <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                              promo.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : promo.status === "PENDING_APPROVAL" ? "bg-amber-50 text-amber-600" : promo.status === "REJECTED" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
                            }`}>
                              {promo.status.replace("_", " ")}
                            </span>
                          </div>
                          {promo.discountPercent !== undefined && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{promo.discountPercent}% off &bull; {promo.startDate} to {promo.endDate}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <h3 className="font-display font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#261CC1]" />
                    Bundles ({bundleProposals.length})
                  </h3>
                  {bundleProposals.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold">No combo bundles designed yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {bundleProposals.map((b) => (
                        <div key={b.id} className="p-2.5 border border-slate-100 rounded-xl bg-slate-50/50">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold text-slate-800 truncate">{b.name}</p>
                            <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                              b.status === "approved" ? "bg-emerald-50 text-emerald-600" : b.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{(b.productNames ?? []).join(" + ")}</p>
                          <p className="text-[10px] font-mono text-slate-600 mt-0.5">{formatValue(b.bundlePrice)} <span className="line-through text-slate-400">{formatValue(b.regularPrice)}</span></p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: shared, bidirectional team inbox for this company */}
            <div>
              <InboxThread company={selectedCompany} currentUser={currentUser} />
            </div>
          </div>
        )}

        {/* TAB 2: COMPANY HEALTH CENTER (MATRIX VIEW) */}
        {activeTab === "HEALTH_CENTER" && (
          !isMaintenanceAllowed ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-slate-900 text-lg">Akses Pemeliharaan & Benchmarking Terkunci</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Owner dari perusahaan <span className="font-bold">{selectedCompany.name}</span> telah membatasi akses ke area pemeliharaan sistem harian, status server, dan integrasi benchmark SaaS.
              </p>
              <div className="p-3 bg-indigo-50 text-[#261CC1] rounded-xl text-xs font-bold inline-block">
                Hubungi Owner untuk mengaktifkan izin "System Maintenance & Industrial Benchmarking" di Owner Dashboard.
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">Company Health Center</h3>
                <p className="text-xs text-slate-500">AI monitors and maps essential health parameters for all F&B entities under management.</p>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-4">Brand / Company</th>
                      <th className="p-4 text-center">Health Score</th>
                      <th className="p-4 text-right">Revenue (30-day)</th>
                    <th className="p-4 text-center">Revenue Growth</th>
                    <th className="p-4 text-center">Gross Margin</th>
                    <th className="p-4 text-center">Inventory Turnover</th>
                    <th className="p-4 text-center">Ingredient Waste</th>
                    <th className="p-4">Recommendation Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {companyHealthData.map((hd) => (
                    <tr key={hd.company.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl bg-slate-100 p-1 rounded">{hd.company.avatarUrl}</span>
                          <div>
                            <p className="font-bold text-slate-800">{hd.company.name}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">{hd.company.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full font-bold font-mono text-xs ${
                          hd.status === "EXCELLENT" ? "bg-emerald-50 text-emerald-700" : hd.status === "STABLE" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {hd.healthScore} / 100
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-800 font-bold">
                        {formatValue(hd.revenue)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold flex items-center justify-center gap-1 ${hd.revGrowth >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {hd.revGrowth >= 0 ? "+" : ""}{hd.revGrowth}%
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono">
                        {hd.profitMargin.toFixed(1)}%
                      </td>
                      <td className="p-4 text-center font-mono text-slate-600">
                        {hd.inventoryTurnover}x / mo
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold ${hd.wastePct > 8 ? "text-rose-500" : "text-emerald-600"}`}>
                          {hd.wastePct}%
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-[#261CC1]">
                        {hd.healthScore >= 80 
                          ? "F&B-OPT-EXC" 
                          : hd.healthScore >= 60 
                            ? "F&B-OPT-STB" 
                            : "F&B-WARN-HIGH-WASTE"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#261CC1] shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-slate-900">AI Consult Center Insights:</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  1 company is flagged under <span className="text-rose-600 font-bold uppercase">"WARNING"</span> due to high food cost and elevated waste percentage (Wagyu Prime Bistro, Waste: 11.8%). Salesforce intervention is recommended to assist in ingredient reorder optimizations.
                </p>
              </div>
            </div>
          </div>
          )
        )}

        {/* TAB 3: BENCHMARK CENTER */}
        {activeTab === "BENCHMARK" && (
          !isMaintenanceAllowed ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-slate-900 text-lg">Akses Pemeliharaan & Benchmarking Terkunci</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Owner dari perusahaan <span className="font-bold">{selectedCompany.name}</span> telah membatasi akses ke area pemeliharaan sistem harian, status server, dan integrasi benchmark SaaS.
              </p>
              <div className="p-3 bg-indigo-50 text-[#261CC1] rounded-xl text-xs font-bold inline-block">
                Hubungi Owner untuk mengaktifkan izin "System Maintenance & Industrial Benchmarking" di Owner Dashboard.
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">SaaS F&B Industrial Benchmark Center</h3>
                <p className="text-xs text-slate-500">Compares client operations with standardized F&B averages in Southeast Asia.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-slate-400 font-bold">Select portfolio focus:</span>
                <span className="text-xs font-black text-[#261CC1]">{selectedCompany.avatarUrl} {selectedCompany.name}</span>
              </div>
            </div>

            {/* Benchmark Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  key: "food",
                  title: "Food Cost",
                  value: selectedCompany.id === "xyz_restaurant" ? "38.2%" : "31.5%",
                  benchmark: "31.0%",
                  isAlert: selectedCompany.id === "xyz_restaurant",
                  accent: "bg-rose-50 border-rose-200 text-rose-700",
                  bar: selectedCompany.id === "xyz_restaurant" ? "bg-rose-500" : "bg-emerald-500"
                },
                {
                  key: "waste",
                  title: "Waste",
                  value: `${activeHealth.wastePct}%`,
                  benchmark: "5.0%",
                  isAlert: activeHealth.wastePct > 8,
                  accent: activeHealth.wastePct > 8 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700",
                  bar: activeHealth.wastePct > 8 ? "bg-amber-500" : "bg-emerald-500"
                },
                {
                  key: "margin",
                  title: "Margin",
                  value: `${activeHealth.profitMargin.toFixed(1)}%`,
                  benchmark: "20.0%",
                  isAlert: false,
                  accent: "bg-indigo-50 border-indigo-200 text-indigo-700",
                  bar: "bg-[#261CC1]"
                }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSelectedBenchmark(item.key as "food" | "waste" | "margin")}
                  className={`rounded-2xl border p-4 text-left transition-all ${selectedBenchmark === item.key ? "border-[#261CC1] bg-indigo-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${item.accent}`}>
                    {item.title}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500">Client</p>
                      <p className="text-lg font-black text-slate-900">{item.value}</p>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500">Benchmark {item.benchmark}</p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${item.bar}`} style={{ width: item.key === "margin" ? `${Math.min(100, (activeHealth.profitMargin / 35) * 100)}%` : item.key === "waste" ? `${Math.min(100, (activeHealth.wastePct / 15) * 100)}%` : selectedCompany.id === "xyz_restaurant" ? "88%" : "70%" }} />
                  </div>
                  <p className={`mt-3 text-[11px] font-semibold ${item.isAlert ? "text-rose-600" : "text-slate-600"}`}>
                    {item.isAlert ? "Action needed" : "Healthy"}
                  </p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowInsightDetail((prev) => !prev)}
              className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50/70 p-4 hover:border-[#261CC1]/40 hover:bg-indigo-50/20 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Selected insight</p>
                  <h4 className="text-sm font-black text-slate-900">
                    {selectedBenchmark === "food" ? "Food Cost" : selectedBenchmark === "waste" ? "Waste" : "Margin"}
                  </h4>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${selectedBenchmark === "food" ? "bg-rose-100 text-rose-700" : selectedBenchmark === "waste" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {selectedBenchmark === "food" ? "Click to review" : selectedBenchmark === "waste" ? "Watch closely" : "Positive"}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {selectedBenchmark === "food"
                  ? "Raw cost is the main lever for margin improvement. Tight supplier terms and portion controls are the fastest wins."
                  : selectedBenchmark === "waste"
                    ? "Waste stays above the target range, so demand forecasting and prep planning should be tightened."
                    : "Profitability remains strong and the current mix supports stable expansion with controlled risk."}
              </p>

              {showInsightDetail && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 animate-in fade-in duration-200">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Trend note</p>
                    <p className="text-xs text-slate-600 mt-1">{BENCHMARK_DETAILS[selectedBenchmark].trend}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Recommended actions</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {BENCHMARK_DETAILS[selectedBenchmark].actions.map((action, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#261CC1] mt-1.5 shrink-0"></span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <p className="mt-3 text-[10px] font-bold text-[#261CC1]">
                {showInsightDetail ? "▲ Hide full breakdown" : "▼ Click to view full breakdown"}
              </p>
            </button>
          </div>
          )
        )}

        {/* TAB 5: AI FORECAST CONSULT HUB */}
        {activeTab === "AI_HUB" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">Salesforce AI Consult Forecast Hub</h3>
                <p className="text-xs text-slate-500">
                  Live analytical recommendations for <strong>{selectedCompany.name}</strong>, generated from real sales, stock, and basket data - prepared for client consultation meetings.
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-[#261CC1] font-mono text-xs font-bold rounded-xl">AI-CONSULTANT v3.5-Active</span>
            </div>

            {forecastLoading && (
              <div className="text-center py-10 text-xs font-semibold text-slate-400">Crunching live sales, stock, and basket data...</div>
            )}

            {!forecastLoading && forecastCards.length === 0 && (
              <div className="text-center py-10 text-xs font-semibold text-slate-400">
                Not enough sales history yet for {selectedCompany.name} to generate forecast insights.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {!forecastLoading && forecastCards.map((forecast) => {
                const isExpanded = expandedForecastId === forecast.id;
                return (
                  <button
                    key={forecast.id}
                    type="button"
                    onClick={() => setExpandedForecastId(isExpanded ? null : forecast.id)}
                    className={`text-left p-5 border rounded-2xl space-y-3 transition-all cursor-pointer ${
                      isExpanded ? "border-[#261CC1] bg-indigo-50/30 shadow-sm" : "border-indigo-100 bg-indigo-50/10 hover:border-[#261CC1]/40 hover:bg-indigo-50/20"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-indigo-100 text-[#261CC1] font-mono">{forecast.tag}</span>
                      <span className="text-xs text-slate-400 font-bold">Reliability: {forecast.reliability}%</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-800">{forecast.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {forecast.summary}
                    </p>
                    <div className="pt-2 border-t border-slate-200/50 flex justify-between text-[11px] font-bold text-indigo-700">
                      <span>Action: {forecast.action}</span>
                      <span>AIBISPRO Recommendation</span>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200/50 space-y-3 animate-in fade-in duration-200">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Projected impact</p>
                          <p className="text-xs text-slate-600 mt-1">{forecast.impact}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Supporting data points</p>
                          <ul className="mt-1.5 space-y-1.5">
                            {forecast.dataPoints.map((point, idx) => (
                              <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                                <ArrowUpRight className="w-3.5 h-3.5 text-[#261CC1] mt-0.5 shrink-0" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Recommended next steps</p>
                          <ul className="mt-1.5 space-y-1.5">
                            {forecast.nextSteps.map((step, idx) => (
                              <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#261CC1] mt-1.5 shrink-0"></span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] font-bold text-[#261CC1]">
                      {isExpanded ? "▲ Hide details" : "▼ Click to view details"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
