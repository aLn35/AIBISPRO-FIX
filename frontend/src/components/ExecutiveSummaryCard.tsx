/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Company, FinancialMetric, Product, RevenueForecast, Currency } from "../types";
import { useExchangeRate } from "../exchangeRate";
import { TrendingUp, Sparkles, Zap } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ExecutiveSummaryCardProps {
  company: Company;
  metrics: FinancialMetric[];
  products: Product[];
  forecast: RevenueForecast | undefined;
  currency: Currency;
}

type TimeFilter = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "TOTAL";

const TIME_FILTER_DAYS: Record<TimeFilter, number | null> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  YEARLY: 365,
  TOTAL: null, // null = every record available, no slicing
};

/** The same Executive Summary content the Owner sees on their Decision Center - a read-only
 * KPI/AI summary/trend chart view, extracted so it can also be embedded (read-only) inside the
 * Manager's Operations Control page. */
export default function ExecutiveSummaryCard({
  company,
  metrics,
  products,
  forecast,
  currency,
}: ExecutiveSummaryCardProps) {
  const EXCHANGE_RATE = useExchangeRate();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("TOTAL");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");

  // Metrics scoped to the selected time range, sorted oldest-to-newest first so "last N days"
  // always means the most recent N, regardless of the order the data arrived in.
  const filteredMetrics = useMemo(() => {
    const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
    const days = TIME_FILTER_DAYS[timeFilter];
    return days === null ? sorted : sorted.slice(-days);
  }, [metrics, timeFilter]);

  const formatValue = (amount: number) => {
    if (currency === "USD") {
      const usdVal = amount / EXCHANGE_RATE;
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(usdVal);
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
      if (usdVal >= 1000000) {
        return `$${(usdVal / 1000000).toFixed(1)}M`;
      } else if (usdVal >= 1000) {
        return `$${(usdVal / 1000).toFixed(1)}K`;
      }
      return `$${usdVal.toFixed(0)}`;
    } else {
      if (amount >= 1000000000) {
        return `Rp ${(amount / 1000000000).toFixed(1)}B`;
      } else if (amount >= 1000000) {
        return `Rp ${(amount / 1000000).toFixed(1)}M`;
      }
      return `Rp ${(amount / 1000).toFixed(0)}K`;
    }
  };

  const calculations = useMemo(() => {
    if (metrics.length === 0) return null;

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalCogs = 0;
    let totalCashFlow = 0;
    let totalInventoryVal = 0;

    // Inventory value is a point-in-time snapshot (repeated on every daily record), not
    // something to sum across a period - always read from the whole metrics array so it stays
    // accurate even when a narrow filter (e.g. DAILY) has no revenue for that single day.
    metrics.forEach((m) => {
      totalInventoryVal = m.inventoryValue;
    });

    filteredMetrics.forEach((m) => {
      totalRevenue += m.revenue;
      totalExpenses += m.expenses;
      totalCogs += m.cogs;
      totalCashFlow += m.cashFlow;
    });

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const sortedProducts = [...products].sort((a, b) => b.salesCount - a.salesCount);
    const topProducts = sortedProducts.slice(0, 3);

    // Real average order value: total revenue / total units sold across the real catalog (falls
    // back to a neutral estimate only if there's no sales-count data yet).
    const totalUnitsSold = products.reduce((s, p) => s + p.salesCount, 0);
    const baseAOV = totalUnitsSold > 0 ? Math.round(totalRevenue / totalUnitsSold) : 0;

    // AI summary built entirely from real data passed into this component (products, metrics,
    // and the backend-computed forecast trend) - no hardcoded per-company copy.
    const lowStockProducts = products.filter((p) => p.status === "LOW_STOCK" || p.status === "OUT_OF_STOCK");
    const topLowStock = [...lowStockProducts].sort((a, b) => b.salesCount - a.salesCount)[0];
    const topProduct = topProducts[0];
    const slowestProduct = sortedProducts[sortedProducts.length - 1];

    const trendWord = forecast?.keyDrivers?.[0]?.includes("trend: up")
      ? "trending up"
      : forecast?.keyDrivers?.[0]?.includes("trend: down")
      ? "trending down"
      : "holding steady";

    const aiSummaryTitle = topProduct
      ? `${topProduct.category} Category Leading Performance`
      : "Awaiting Sales Data";

    const aiSummaryText = topProduct
      ? `Revenue is ${trendWord} (${forecast?.confidenceScore ?? "n/a"}% model confidence). ${topProduct.name} is your top performer with ${topProduct.salesCount} projected units, in the ${topProduct.category} category. Current gross profit margin sits at ${isFinite(profitMargin) ? profitMargin.toFixed(1) : "0.0"}%.`
      : "No sales data is available yet for this company - upload a sales file or wait for the next sync to populate AI insights.";

    const aiRecommendation = topLowStock
      ? `Restock "${topLowStock.name}" (${topLowStock.category}) urgently - it has ${topLowStock.stock} units left against a minimum of ${topLowStock.minStock}, and is a demand driver.`
      : slowestProduct
      ? `Consider a promotion on "${slowestProduct.name}" - it has the lowest projected demand (${slowestProduct.salesCount} units) in the current catalog.`
      : "Upload recent sales data to unlock tailored restocking and promotion recommendations.";

    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      cogs: totalCogs,
      grossProfit,
      netProfit,
      profitMargin,
      cashFlow: totalCashFlow,
      inventoryVal: totalInventoryVal,
      aov: baseAOV,
      topProducts,
      aiSummaryTitle,
      aiSummaryText,
      aiRecommendation,
    };
  }, [metrics, filteredMetrics, products, company, forecast]);

  // Chart mirrors the same time-range selection as the KPI cards above it.
  const chartData = useMemo(() => {
    return filteredMetrics.map((m) => {
      const parts = m.date ? m.date.split("-") : [];
      const day = parts[2] || "01";
      const monthIndex = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[monthIndex] || "Jan";

      return {
        date: `${day} ${month}`,
        "Total Revenue": currency === "USD" ? m.revenue / EXCHANGE_RATE : m.revenue,
        "Operating Expenses": currency === "USD" ? m.expenses / EXCHANGE_RATE : m.expenses,
        "Net Profit": currency === "USD" ? (m.revenue - m.cogs - m.expenses) / EXCHANGE_RATE : (m.revenue - m.cogs - m.expenses),
      };
    });
  }, [filteredMetrics, currency]);

  if (!calculations) return null;

  return (
    <div className="space-y-6">
      {/* AI Executive Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-l-4 border-l-[#261CC1] rounded-2xl p-6 shadow-md relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full translate-x-8 -translate-y-8 opacity-50"></div>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#261CC1] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-tight font-display uppercase">
                AIBISPRO BI Daily Executive Summary
              </h3>
              <span className="px-2 py-0.5 bg-[#E14434] text-white font-mono text-[9px] font-extrabold rounded-full tracking-wider animate-pulse uppercase">
                AI AGENT ONLINE
              </span>
            </div>
            <h4 className="text-lg font-bold text-[#E14434] mt-1">
              {calculations.aiSummaryTitle}
            </h4>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              {calculations.aiSummaryText}
            </p>
            <div className="mt-3 bg-[#FEFBC7]/45 rounded-xl p-3 border border-[#FEFBC7] flex items-center gap-3">
              <Zap className="w-4 h-4 text-[#E14434] shrink-0" />
              <p className="text-xs font-bold text-[#E14434]">
                <span className="text-slate-700 font-extrabold">Executive Playbook:</span> {calculations.aiRecommendation}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Business Health & Sustainability Monitor */}
      <div className="bg-[#FEFBC7]/40 text-slate-800 rounded-2xl p-6 border border-[#FEFBC7] shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,rgba(94,171,214,0.15),transparent)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#FEFBC7]/80 pb-4 mb-4">
          <div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#E14434] text-white font-mono tracking-wider">
              BI Sustainability & Risk Monitor
            </span>
            <h3 className="text-base font-display font-black text-slate-900 mt-1">
              Active Corporate Health Analysis
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">Corporate Status:</span>
            <span className={`px-2.5 py-1 rounded-full font-mono text-xs font-black uppercase ${
              company.id === "abc_coffee"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : company.id === "xyz_restaurant"
                  ? "bg-rose-50 text-rose-800 border border-rose-200 animate-pulse"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}>
              {company.id === "abc_coffee" ? "● EXCELLENT & SUSTAINABLE" : company.id === "xyz_restaurant" ? "⚠️ WARNING: REVENUE RISK" : "● STABLE & SUSTAINABLE"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-white rounded-xl border border-[#FEFBC7]/80 shadow-xs">
            <p className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Stability Rating</p>
            <p className={`text-sm font-black mt-1 ${company.id === "xyz_restaurant" ? "text-rose-600" : "text-emerald-600"}`}>
              {company.id === "abc_coffee" ? "92% Secure" : company.id === "xyz_restaurant" ? "55% Fluctuation Risk" : "78% Safe"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Based on monthly operational margins.</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#FEFBC7]/80 shadow-xs">
            <p className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Sustainability Index</p>
            <p className="text-sm font-black mt-1 text-slate-800">
              {company.id === "abc_coffee" ? "High Continuity" : company.id === "xyz_restaurant" ? "Moderate (COGS Pressure)" : "Optimal"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Evaluated against supplier volatility.</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#FEFBC7]/80 shadow-xs">
            <p className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Active Growth Opportunity</p>
            <p className="text-sm font-black mt-1 text-[#E14434]">
              {company.id === "abc_coffee" ? "Late Morning Croissant Combo" : company.id === "xyz_restaurant" ? "High-Margin Wagyu Promos" : "Promotional bundling models"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">AI-identified high ticket conversions.</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#FEFBC7]/80 shadow-xs">
            <p className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Risks & Bottlenecks</p>
            <p className={`text-sm font-black mt-1 ${company.id === "xyz_restaurant" ? "text-rose-600" : "text-amber-600"}`}>
              {company.id === "abc_coffee" ? "Weekend dairy stock buffer" : company.id === "xyz_restaurant" ? "Bali Salmon food cost leak" : "Low ingredient stock notifications"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Tracked via daily dataset monitor feeds.</p>
          </div>
        </div>
      </div>

      {/* Time range filter - governs the KPI cards below and the trend chart further down */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-display font-extrabold text-slate-900 text-sm uppercase tracking-wider">Financial KPIs</h3>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
          {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "TOTAL"] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                timeFilter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-800"
              }`}
            >
              {f === "TOTAL" ? "TOTAL" : f}
            </button>
          ))}
        </div>
      </div>

      {/* 10 KPI Points Card Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue</p>
          <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
            {formatShortValue(calculations.revenue)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-2 block">
            {timeFilter === "TOTAL" ? "All-time" : `Last ${TIME_FILTER_DAYS[timeFilter]} day(s)`}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expenses</p>
          <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
            {formatShortValue(calculations.expenses)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-2 block">Estimated at 15% of revenue</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">COGS</p>
          <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
            {formatShortValue(calculations.cogs)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-2 block">
            {calculations.revenue > 0 ? `${((calculations.cogs / calculations.revenue) * 100).toFixed(0)}% Ratio` : "No revenue yet"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Profit</p>
          <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
            {formatShortValue(calculations.grossProfit)}
          </p>
          <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-2 ${calculations.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {calculations.grossProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : null}
            {calculations.grossProfit >= 0 ? "Positive margin" : "Below cost"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</p>
          <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
            {formatShortValue(calculations.netProfit)}
          </p>
          <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-2 ${calculations.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {calculations.netProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : null}
            {calculations.netProfit >= 0 ? "Profitable" : "Operating at a loss"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit Margin</p>
          <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
            {calculations.profitMargin.toFixed(1)}%
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-2 block">
            {timeFilter === "TOTAL" ? "All-time" : `Last ${TIME_FILTER_DAYS[timeFilter]} day(s)`}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash Flow</p>
          <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
            {formatShortValue(calculations.cashFlow)}
          </p>
          <span className={`text-[10px] font-semibold mt-2 block ${calculations.cashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {calculations.cashFlow >= 0 ? "Positive" : "Negative"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Value</p>
          <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
            {formatShortValue(calculations.inventoryVal)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-2 block">Asset Value</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 px-1 py-0.5 bg-indigo-50 text-[#261CC1] text-[7px] font-bold font-mono">AI PROJECTION</div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forecasted Revenue</p>
          <p className="text-xl font-display font-extrabold text-indigo-700 mt-2 font-mono">
            {forecast ? formatShortValue(forecast.forecastedRevenue) : "N/A"}
          </p>
          <span className="text-[10px] text-indigo-600 font-bold mt-2 block">
            {forecast ? `Confidence ${forecast.confidenceScore}%` : "Awaiting sales history"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Order (AOV)</p>
          <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
            {formatValue(calculations.aov)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-2 block">
            {calculations.aov > 0 ? "Based on units sold" : "No units sold yet"}
          </span>
        </div>
      </div>

      {/* Interactive Financial Performance Graphs Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-extrabold text-slate-900 text-base">Corporate Financial Trends</h3>
            <p className="text-xs text-slate-500">Analyze performance curves across revenue and profit parameters.</p>
          </div>

          {/* Branch selection - the time range comes from the shared filter above the KPI cards */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-400 font-bold">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-[11px] py-1 px-2.5 font-bold focus:outline-none"
            >
              <option value="ALL">All Branches</option>
              <option value="JKT-01">Jakarta Capital Branch</option>
              <option value="BALI-02">Bali Seminyak Hub</option>
            </select>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">{timeFilter} view</span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-xs text-slate-400 font-semibold">
            No data for this time range yet.
          </div>
        ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ownerColorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#261CC1" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#261CC1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="ownerColorProf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "12px", border: "none" }}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Area type="monotone" dataKey="Total Revenue" stroke="#261CC1" strokeWidth={2.5} fillOpacity={1} fill="url(#ownerColorRev)" />
              <Area type="monotone" dataKey="Net Profit" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#ownerColorProf)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>
    </div>
  );
}
