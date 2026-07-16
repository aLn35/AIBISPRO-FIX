/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Company, FinancialMetric, Product, Promotion, Currency, TimeFilter } from "../types";
import { EXCHANGE_RATE } from "../mockData";
import {
  CalendarDays,
  LineChart,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Activity,
  Warehouse,
  PieChart as PieIcon,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface FinancialIntelligenceProps {
  company: Company;
  metrics: FinancialMetric[];
  products: Product[];
  promotions: Promotion[];
  currency: Currency;
}

export default function FinancialIntelligence({
  company,
  metrics,
  products,
  promotions,
  currency,
}: FinancialIntelligenceProps) {
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>("LAST_30_DAYS");
  const [activeChartTab, setActiveChartTab] = useState<
    "REVENUE" | "EXPENSE" | "PROFIT" | "MARGIN" | "CASHFLOW" | "INVENTORY" | "PROMOTION" | "FORECAST" | "BRANCH" | "PRODUCT"
  >("REVENUE");

  // Format currency helpers
  const formatValue = (amount: number) => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(amount / EXCHANGE_RATE);
    } else {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount);
    }
  };

  const formatShortValue = (amount: number) => {
    if (currency === "USD") {
      const usdVal = amount / EXCHANGE_RATE;
      if (usdVal >= 1000000) return `$${(usdVal / 1000000).toFixed(1)}M`;
      if (usdVal >= 1000) return `$${(usdVal / 1000).toFixed(1)}K`;
      return `$${usdVal.toFixed(0)}`;
    } else {
      if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}B`;
      if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}M`;
      return `Rp ${(amount / 1000).toFixed(0)}K`;
    }
  };

  // 1. Time Filter logic to subset the 30-day historical metrics
  const filteredMetrics = useMemo(() => {
    const today = new Date();
    const companyMetrics = metrics.filter((m) => m.companyId === company.id);

    if (activeTimeFilter === "TODAY") {
      return companyMetrics.slice(-1);
    } else if (activeTimeFilter === "YESTERDAY") {
      return companyMetrics.slice(-2, -1);
    } else if (activeTimeFilter === "LAST_7_DAYS") {
      return companyMetrics.slice(-7);
    } else if (activeTimeFilter === "LAST_30_DAYS" || activeTimeFilter === "THIS_MONTH" || activeTimeFilter === "LAST_MONTH") {
      return companyMetrics; // full catalog of 30 days
    } else if (activeTimeFilter === "QUARTERLY" || activeTimeFilter === "YEARLY") {
      return companyMetrics;
    }
    return companyMetrics;
  }, [metrics, company, activeTimeFilter]);

  // Pre-calculate aggregate metrics for the filtered time subset
  const aggregates = useMemo(() => {
    if (filteredMetrics.length === 0) return null;

    let revenueSum = 0;
    let expenseSum = 0;
    let cogsSum = 0;
    let cashFlowSum = 0;
    let latestInventoryVal = 0;

    filteredMetrics.forEach((m) => {
      revenueSum += m.revenue;
      expenseSum += m.expenses;
      cogsSum += m.cogs;
      cashFlowSum += m.cashFlow;
      latestInventoryVal = m.inventoryValue;
    });

    const grossProfit = revenueSum - cogsSum;
    const netProfit = grossProfit - expenseSum;
    const profitMargin = revenueSum > 0 ? (netProfit / revenueSum) * 100 : 0;
    const avgTransVal = company.id === "abc_coffee" ? 45000 : company.id === "xyz_restaurant" ? 185000 : company.id === "sushi_house" ? 220000 : 85000;

    return {
      revenue: revenueSum,
      expenses: expenseSum,
      cogs: cogsSum,
      grossProfit,
      netProfit,
      profitMargin,
      cashFlow: cashFlowSum,
      inventoryVal: latestInventoryVal,
      avgTransVal,
    };
  }, [filteredMetrics, company]);

  // Chart rendering datasets
  const chartData = useMemo(() => {
    return filteredMetrics.map((m) => {
      const parts = m.date ? m.date.split("-") : [];
      const label = parts.length >= 3 ? `${parts[2]} / ${parts[1]}` : m.date || "N/A";

      // Currency converts
      const div = currency === "USD" ? EXCHANGE_RATE : 1;

      return {
        date: label,
        Revenue: Math.round(m.revenue / div),
        Expenses: Math.round(m.expenses / div),
        Profit: Math.round((m.revenue - m.cogs - m.expenses) / div),
        COGS: Math.round(m.cogs / div),
        CashFlow: Math.round(m.cashFlow / div),
        InventoryVal: Math.round(m.inventoryValue / div),
        MarginPercent: parseFloat((((m.revenue - m.cogs - m.expenses) / (m.revenue || 1)) * 100).toFixed(1)),
      };
    });
  }, [filteredMetrics, currency]);

  // comparative branch data mock
  const branchData = useMemo(() => {
    const div = currency === "USD" ? EXCHANGE_RATE : 1;
    const list = [];
    for (let i = 1; i <= company.branches; i++) {
      const rev = Math.round((aggregates?.revenue || 40000000) / company.branches * (0.8 + Math.random() * 0.4));
      list.push({
        name: `Branch #${i}`,
        Revenue: Math.round(rev / div),
        Profit: Math.round((rev * 0.25) / div),
      });
    }
    return list.sort((a, b) => b.Revenue - a.Revenue);
  }, [company, aggregates, currency]);

  // promotion performance mock
  const promoChartData = useMemo(() => {
    const div = currency === "USD" ? EXCHANGE_RATE : 1;
    return promotions
      .filter((p) => p.companyId === company.id)
      .map((p) => ({
        name: (p.name || "").split(" ")[0] + "...",
        Revenue: Math.round(p.revenueGenerated / div),
        Conversion: p.conversionRate,
      }));
  }, [promotions, company, currency]);

  const COLORS = ["#261CC1", "#3A9AFF", "#F1FF5E", "#1C0770", "#EF4444", "#10B981"];

  const timeFilterLabels: { id: TimeFilter; label: string }[] = [
    { id: "TODAY", label: "Today" },
    { id: "YESTERDAY", label: "Yesterday" },
    { id: "LAST_7_DAYS", label: "Last 7 Days" },
    { id: "LAST_30_DAYS", label: "Last 30 Days" },
    { id: "THIS_MONTH", label: "This Month" },
    { id: "LAST_MONTH", label: "Last Month" },
    { id: "QUARTERLY", label: "Quarterly" },
    { id: "YEARLY", label: "Yearly" },
  ];

  return (
    <div className="space-y-6">
      {/* Module Heading */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-[#E14434] text-2xl">Financial Intelligence Center</h2>
          <p className="text-xs text-slate-500 mt-1">Dedicated auditing desk: trace margins, profits, branch performance, and COGS</p>
        </div>

        {/* Dynamic Time Filter */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl shadow-sm self-start">
          {timeFilterLabels.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveTimeFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTimeFilter === filter.id
                  ? "bg-white text-[#E14434] shadow-sm font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* subset metrics stats - 9 KPI Points */}
      {aggregates && (
        <div className="grid grid-cols-2 md:grid-cols-9 gap-3">
          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatShortValue(aggregates.revenue)}</p>
          </div>
          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatShortValue(aggregates.expenses)}</p>
          </div>
          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COGS</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatShortValue(aggregates.cogs)}</p>
          </div>
          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Profit</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatShortValue(aggregates.grossProfit)}</p>
          </div>
          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Profit</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatShortValue(aggregates.netProfit)}</p>
          </div>
          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profit Margin</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">{aggregates.profitMargin.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Flow</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatShortValue(aggregates.cashFlow)}</p>
          </div>
          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inventory Val</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatShortValue(aggregates.inventoryVal)}</p>
          </div>
          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Order Val</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatShortValue(aggregates.avgTransVal)}</p>
          </div>
        </div>
      )}

      {/* TAB SELECTOR FOR THE 10 CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm h-fit space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Audit Reports ({filteredMetrics.length} days data)</p>
          
          {[
            { id: "REVENUE", label: "1. Revenue Trend", icon: LineChart, color: "text-[#5EABD6]" },
            { id: "EXPENSE", label: "2. Expense Trend", icon: TrendingDown, color: "text-rose-500" },
            { id: "PROFIT", label: "3. Profit Trend", icon: TrendingUp, color: "text-emerald-500" },
            { id: "MARGIN", label: "4. Margin Trend", icon: Percent, color: "text-indigo-600" },
            { id: "CASHFLOW", label: "5. Cash Flow Trend", icon: DollarSign, color: "text-teal-500" },
            { id: "INVENTORY", label: "6. Inventory Trend", icon: Warehouse, color: "text-amber-500" },
            { id: "PROMOTION", label: "7. Promo Impact", icon: PieIcon, color: "text-[#5EABD6]" },
            { id: "FORECAST", label: "8. Forecast Trend", icon: Sparkles, color: "text-[#E14434]" },
            { id: "BRANCH", label: "9. Branch Performance", icon: Activity, color: "text-[#E14434]" },
            { id: "PRODUCT", label: "10. Product Volume", icon: Layers, color: "text-[#EF4444]" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeChartTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveChartTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all text-xs font-bold ${
                  isSel
                    ? "bg-[#E14434] text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSel ? "text-[#FEFBC7]" : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Large Chart Canvas */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <h3 className="font-display font-extrabold text-slate-900 text-lg">
              {activeChartTab === "REVENUE" && "1. Revenue Trend Analysis"}
              {activeChartTab === "EXPENSE" && "2. Expense Overhead Analysis"}
              {activeChartTab === "PROFIT" && "3. Net Profitability Growth"}
              {activeChartTab === "MARGIN" && "4. Percentage Net Margin Spread"}
              {activeChartTab === "CASHFLOW" && "5. Working Cash Flow Liquidity"}
              {activeChartTab === "INVENTORY" && "6. Logistical Inventory Valuation"}
              {activeChartTab === "PROMOTION" && "7. Campaign Conversion Impact"}
              {activeChartTab === "FORECAST" && "8. Predictive July 2026 Forecast"}
              {activeChartTab === "BRANCH" && "9. Inter-branch Revenue Comparison"}
              {activeChartTab === "PRODUCT" && "10. Product Sales Volume Rank"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeChartTab === "REVENUE" && "Tracks the absolute gross daily inflow of transactions."}
              {activeChartTab === "EXPENSE" && "Details fixed expenditures, labor costs, lease, and raw bulk supply prices."}
              {activeChartTab === "PROFIT" && "Net earnings after deducting COGS and operating expenditures."}
              {activeChartTab === "MARGIN" && "Percentage profitability ratio indicating unit margin strength."}
              {activeChartTab === "CASHFLOW" && "Physical cash positions reflecting absolute solvency levels."}
              {activeChartTab === "INVENTORY" && "Value of active stock held in branch warehouses."}
              {activeChartTab === "PROMOTION" && "Sales generated specifically via marketing discount codes."}
              {activeChartTab === "FORECAST" && "Projected growth rates based on seasonal trends and local event logs."}
              {activeChartTab === "BRANCH" && "De-consolidates yield contributions across branches."}
              {activeChartTab === "PRODUCT" && "Lists cumulative unit counts of catalog orders."}
            </p>
          </div>

          <div className="h-[320px] my-6">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === "REVENUE" && (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#261CC1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#261CC1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Revenue" stroke="#261CC1" strokeWidth={2.5} fill="url(#g1)" />
                </AreaChart>
              )}

              {activeChartTab === "EXPENSE" && (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}

              {activeChartTab === "PROFIT" && (
                <ReLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ReLineChart>
              )}

              {activeChartTab === "MARGIN" && (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Area type="monotone" dataKey="MarginPercent" stroke="#4F46E5" strokeWidth={2.5} fill="url(#g2)" name="Margin %" />
                </AreaChart>
              )}

              {activeChartTab === "CASHFLOW" && (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="CashFlow" fill="#14B8A6" radius={[4, 4, 0, 0]} name="Cash Flow" />
                </BarChart>
              )}

              {activeChartTab === "INVENTORY" && (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="InventoryVal" stroke="#F59E0B" strokeWidth={2.5} fill="url(#g3)" name="Inventory Valuation" />
                </AreaChart>
              )}

              {activeChartTab === "PROMOTION" && (
                <BarChart data={promoChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#3A9AFF" radius={[0, 4, 4, 0]} name="Campaign Sales" />
                </BarChart>
              )}

              {activeChartTab === "FORECAST" && (
                <ReLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Revenue" stroke="#CBD5E1" strokeDasharray="5 5" strokeWidth={2} name="Current Inflow" />
                  <Line type="monotone" dataKey="Profit" stroke="#261CC1" strokeWidth={3} name="Forecast Growth" />
                </ReLineChart>
              )}

              {activeChartTab === "BRANCH" && (
                <BarChart data={branchData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#261CC1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="#3A9AFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}

              {activeChartTab === "PRODUCT" && (
                <BarChart
                  data={products
                    .filter((p) => p.companyId === company.id)
                    .map((p) => ({ name: (p.name || "").split(" ")[0], Qty: p.salesCount || 0 }))
                    .sort((a, b) => b.Qty - a.Qty)
                    .slice(0, 5)}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Qty" fill="#EF4444" radius={[4, 4, 0, 0]} name="Units Sold" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-50 border p-3.5 rounded-xl text-slate-500 font-semibold leading-relaxed">
            <Sparkles className="w-4 h-4 text-[#261CC1] shrink-0" />
            <span>
              All historical trends are computed dynamically using local Jakarta ledger records. Convert back to IDR to see base currency figures.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
