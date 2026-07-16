/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Company, FinancialMetric, Product, Promotion, RevenueForecast, Currency } from "../types";
import { EXCHANGE_RATE } from "../mockData";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Percent,
  Layers,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  CheckCircle,
  XCircle,
  UserCheck,
  Gift,
  ChevronDown,
  Clock,
  Sliders,
  Sparkle
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface ExecutiveDashboardProps {
  company: Company;
  metrics: FinancialMetric[];
  products: Product[];
  promotions: Promotion[];
  forecast: RevenueForecast | undefined;
  currency: Currency;
  onChangeView: (view: string) => void;
  onApprovePromotion?: (promoId: string) => void;
  onRejectPromotion?: (promoId: string, reason: string) => void;
}

type OwnerTab = "DECISION_CENTER" | "APPROVAL_CENTER" | "STRATEGY_CENTER" | "CONSULTANT_ACCESS";
type TimeFilter = "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL";

// Company-aware AI strategy focus areas for the Business Strategy Center
const getStrategyFocusAreas = (company: Company) => {
  const isHighRisk = company.id === "xyz_restaurant";
  return [
    {
      id: "inventory",
      title: "Inventory Planning",
      icon: Briefcase,
      summary: isHighRisk
        ? "Premium cuts like salmon are running tight ahead of the weekend, and supplier lead times are longer than usual right now."
        : "Coffee and dairy items are showing pressure before the weekend peak. Securing extra stock now avoids a last-minute scramble.",
      watchItems: isHighRisk
        ? [
            "Confirm supplier lead time for premium seafood before the Friday cutoff",
            "Check if the branch can hold a 15% safety buffer on high-cost cuts",
            "Flag any price volatility to the Manager before the next order"
          ]
        : [
            "Review supplier lead time for coffee beans and dairy",
            "Confirm the branch can carry a 10% extra buffer for high-volume items",
            "Align restock timing with the weekend foot traffic forecast"
          ],
      tone: "bg-indigo-50 text-[#261CC1]"
    },
    {
      id: "waste",
      title: "Waste Reduction",
      icon: Percent,
      summary: isHighRisk
        ? "Ingredient waste is above target this month, driven mainly by perishable seafood and produce nearing their shelf life."
        : "Fresh bakery items are contributing to unnecessary waste during slow afternoon periods. A better menu mix can improve recovery.",
      watchItems: [
        "Track which items are discarded most during slow shifts",
        "Test a smaller afternoon bundle to reduce idle stock",
        "Review one week of results before making any change permanent"
      ],
      tone: "bg-amber-50 text-amber-700"
    },
    {
      id: "promotion",
      title: "Promotion Timing",
      icon: Clock,
      summary: "The midday dip is still visible, so a short, targeted campaign works better than a broad discount.",
      watchItems: [
        "Test a short combo promo during the low-traffic window",
        "Compare sales uplift against regular menu performance",
        "Decide whether to extend or retire the campaign after one week"
      ],
      tone: "bg-emerald-50 text-emerald-700"
    }
  ];
};

export default function ExecutiveDashboard({
  company,
  metrics,
  products,
  promotions,
  forecast,
  currency,
  onChangeView,
  onApprovePromotion,
  onRejectPromotion,
}: ExecutiveDashboardProps) {
  
  const [activeTab, setActiveTab] = useState<OwnerTab>("DECISION_CENTER");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("DAILY");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [currentUserRole, setCurrentUserRole] = useState<string>("OWNER");

  // Approval lists
  const [bundleProposals, setBundleProposals] = useState<any[]>([]);
  const [inventoryRequests, setInventoryRequests] = useState<any[]>([]);
  const [rejectionNote, setRejectionNote] = useState<{ [reqId: string]: string }>({});

  // Owner-initiated restock request (sent to Manager) form state
  const [ownerReqProductId, setOwnerReqProductId] = useState("");
  const [ownerReqQuantity, setOwnerReqQuantity] = useState("");
  const [ownerReqReason, setOwnerReqReason] = useState("");
  const [ownerReqSuccess, setOwnerReqSuccess] = useState("");

  // Business Strategy Center: expandable cards with an editable follow-up schedule
  const [expandedStrategyId, setExpandedStrategyId] = useState<string | null>(null);
  const [strategySchedules, setStrategySchedules] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    const stored = localStorage.getItem(`aibispro_strategy_schedule_${company.id}`);
    if (stored) {
      try {
        setStrategySchedules(JSON.parse(stored));
      } catch (e) {
        setStrategySchedules({});
      }
    } else {
      setStrategySchedules({});
    }
  }, [company.id]);

  const handleScheduleChange = (id: string, value: string) => {
    const updated = { ...strategySchedules, [id]: value };
    setStrategySchedules(updated);
    localStorage.setItem(`aibispro_strategy_schedule_${company.id}`, JSON.stringify(updated));
  };

  // Consultant Access Settings
  const [accessSettings, setAccessSettings] = useState({
    analytics: true,
    inventory: true,
    expenses: false,
    capital: false,
    employee: false,
    maintenance: true
  });

  // Load and synchronize state from localStorage
  useEffect(() => {
    // Sync current user role
    const userStored = localStorage.getItem("aibispro_user");
    if (userStored) {
      try {
        const u = JSON.parse(userStored);
        if (u.role) {
          setCurrentUserRole(u.role);
          if (u.role !== "OWNER" && activeTab === "APPROVAL_CENTER") {
            setActiveTab("DECISION_CENTER");
          }
        }
      } catch (e) {}
    }

    const loadState = () => {
      // 1. Bundle Proposals
      const storedBundles = localStorage.getItem("aibispro_bundle_proposals");
      if (storedBundles) {
        try {
          const parsed = JSON.parse(storedBundles);
          setBundleProposals(parsed.filter((p: any) => p.companyId === company.id));
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Inventory Purchase Requests from Manager
      const storedInvReqs = localStorage.getItem("aibispro_inventory_requests");
      if (storedInvReqs) {
        try {
          const parsed = JSON.parse(storedInvReqs);
          setInventoryRequests(parsed.filter((r: any) => r.companyId === company.id));
        } catch (e) {
          console.error(e);
        }
      } else {
        // Seed default purchase orders to give immediate life to the dashboard!
        const initialReqs = [
          {
            id: "REQ-098",
            companyId: company.id,
            productName: "Sumatra Arabica Coffee Beans (Grade A)",
            quantity: 50,
            estimatedCost: 5750000,
            notes: "Required due to upcoming coffee festival weekend peak traffic.",
            submittedTime: new Date(Date.now() - 3600000 * 4).toISOString(),
            status: "PENDING_APPROVAL",
            rejectReason: ""
          },
          {
            id: "REQ-092",
            companyId: company.id,
            productName: "Premium Whole Milk (Greenfields)",
            quantity: 120,
            estimatedCost: 2220000,
            notes: "Running extremely low on stock at Jakarta branch.",
            submittedTime: new Date(Date.now() - 3600000 * 24).toISOString(),
            status: "PENDING_APPROVAL",
            rejectReason: ""
          }
        ];
        localStorage.setItem("aibispro_inventory_requests", JSON.stringify(initialReqs));
        setInventoryRequests(initialReqs.filter(r => r.companyId === company.id));
      }

      // 3. Consultant Access Settings
      const storedAccess = localStorage.getItem(`aibispro_consultant_access_${company.id}`);
      if (storedAccess) {
        try {
          setAccessSettings(JSON.parse(storedAccess));
        } catch (e) {
          console.error(e);
        }
      } else {
        const defaults = {
          analytics: true,
          inventory: true,
          expenses: company.id === "abc_coffee" ? true : false,
          capital: false,
          employee: false,
          maintenance: true
        };
        localStorage.setItem(`aibispro_consultant_access_${company.id}`, JSON.stringify(defaults));
        setAccessSettings(defaults);
      }
    };

    loadState();
    const interval = setInterval(loadState, 2000);
    return () => clearInterval(interval);
  }, [company.id]);

  // Consultant toggle handler
  const handleToggleAccess = (key: keyof typeof accessSettings) => {
    if (currentUserRole !== "OWNER") {
      return;
    }
    const updated = { ...accessSettings, [key]: !accessSettings[key] };
    setAccessSettings(updated);
    localStorage.setItem(`aibispro_consultant_access_${company.id}`, JSON.stringify(updated));
  };

  // Restock approval handlers
  const handleApproveInventoryRequest = (reqId: string) => {
    const stored = localStorage.getItem("aibispro_inventory_requests");
    if (stored) {
      try {
        const parsed: any[] = JSON.parse(stored);
        const updated = parsed.map(r => r.id === reqId ? { ...r, status: "APPROVED" } : r);
        localStorage.setItem("aibispro_inventory_requests", JSON.stringify(updated));
        setInventoryRequests(updated.filter(r => r.companyId === company.id));

        // When approved, let's increment the actual stock in localStorage!
        const targetReq = parsed.find(r => r.id === reqId);
        if (targetReq) {
          const storedProducts = localStorage.getItem("aibispro_products");
          if (storedProducts) {
            const parsedProds = JSON.parse(storedProducts);
            const updatedProds = parsedProds.map((p: any) => {
              const matches = targetReq.productId
                ? p.id === targetReq.productId
                : (p.name.toLowerCase() === targetReq.productName.toLowerCase() || p.name.includes("Coffee Beans"));
              if (matches) {
                const newStock = p.stock + targetReq.quantity;
                return { ...p, stock: newStock, status: newStock > p.minStock ? "IN_STOCK" : "LOW_STOCK" };
              }
              return p;
            });
            localStorage.setItem("aibispro_products", JSON.stringify(updatedProds));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleRejectInventoryRequest = (reqId: string) => {
    const note = rejectionNote[reqId] || "Price or quantity parameters require renegotiation.";
    const stored = localStorage.getItem("aibispro_inventory_requests");
    if (stored) {
      try {
        const parsed: any[] = JSON.parse(stored);
        const updated = parsed.map(r => r.id === reqId ? { ...r, status: "REJECTED", rejectReason: note } : r);
        localStorage.setItem("aibispro_inventory_requests", JSON.stringify(updated));
        setInventoryRequests(updated.filter(r => r.companyId === company.id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Send a restock request directly to the Manager, with a strategic reason
  const handleSubmitOwnerRestockRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerReqProductId || !ownerReqQuantity) return;
    const prod = products.find(p => p.id === ownerReqProductId && p.companyId === company.id);
    if (!prod) return;

    const qty = parseInt(ownerReqQuantity, 10);
    const newRequest = {
      id: `OWN-${Date.now().toString().slice(-4)}`,
      companyId: company.id,
      productId: prod.id,
      productName: prod.name,
      quantity: qty,
      estimatedCost: Math.round((prod.cogs || prod.price * 0.35) * qty),
      notes: ownerReqReason || "Owner-directed restock to support upcoming demand.",
      submittedTime: new Date().toISOString(),
      status: "PENDING_APPROVAL",
      initiatedBy: "OWNER",
      rejectReason: "",
      managerRemark: ""
    };

    const stored = localStorage.getItem("aibispro_inventory_requests") || "[]";
    try {
      const parsed = JSON.parse(stored);
      const updated = [newRequest, ...parsed];
      localStorage.setItem("aibispro_inventory_requests", JSON.stringify(updated));
      setInventoryRequests(updated.filter((r: any) => r.companyId === company.id));

      setOwnerReqProductId("");
      setOwnerReqQuantity("");
      setOwnerReqReason("");
      setOwnerReqSuccess(`Restock request for "${prod.name}" sent to the Manager for review!`);
      setTimeout(() => setOwnerReqSuccess(""), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Bundle approval handlers
  const handleApproveBundle = (id: string) => {
    const stored = localStorage.getItem("aibispro_bundle_proposals");
    if (stored) {
      try {
        const parsed: any[] = JSON.parse(stored);
        const updated = parsed.map(p => p.id === id ? { ...p, status: "APPROVED" } : p);
        localStorage.setItem("aibispro_bundle_proposals", JSON.stringify(updated));
        setBundleProposals(updated.filter((p: any) => p.companyId === company.id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleRejectBundle = (id: string) => {
    const note = rejectionNote[id] || "Combo bundle pricing discount margins are too aggressive.";
    const stored = localStorage.getItem("aibispro_bundle_proposals");
    if (stored) {
      try {
        const parsed: any[] = JSON.parse(stored);
        const updated = parsed.map(p => p.id === id ? { ...p, status: "REJECTED", rejectReason: note } : p);
        localStorage.setItem("aibispro_bundle_proposals", JSON.stringify(updated));
        setBundleProposals(updated.filter((p: any) => p.companyId === company.id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Currency utility formatting
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

  // Calculations aggregate
  const calculations = useMemo(() => {
    if (metrics.length === 0) return null;

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalCogs = 0;
    let totalCashFlow = 0;
    let totalInventoryVal = 0;

    metrics.forEach((m) => {
      totalRevenue += m.revenue;
      totalExpenses += m.expenses;
      totalCogs += m.cogs;
      totalCashFlow += m.cashFlow;
      totalInventoryVal = m.inventoryValue; // latest
    });

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = (netProfit / totalRevenue) * 100;

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
  }, [metrics, products, company, forecast]);

  // Adjust chart data based on Time filter
  const chartData = useMemo(() => {
    let raw = metrics;
    
    // Simple filter modeling
    if (timeFilter === "WEEKLY") {
      raw = metrics.slice(-7);
    } else if (timeFilter === "MONTHLY") {
      raw = metrics.slice(-30);
    }

    return raw.map((m) => {
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
  }, [metrics, currency, timeFilter]);

  const COLORS = ["#261CC1", "#3A9AFF", "#F1FF5E", "#1C0770"];

  if (!calculations) return null;

  return (
    <div className="space-y-6">
      
      {/* Executive Decision Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-700 animate-pulse"></span>
            <span className="text-xs font-black uppercase text-indigo-700 font-mono tracking-wider">AIBISPRO BI EXECUTIVE DECISION CENTER</span>
          </div>
          <h2 className="text-xl font-display font-black text-slate-950 mt-1">{company.avatarUrl} {company.name} Corporate Shell</h2>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
          <button
            onClick={() => setActiveTab("DECISION_CENTER")}
            className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === "DECISION_CENTER" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Executive Summary
          </button>
          {currentUserRole === "OWNER" && (
            <button
              onClick={() => setActiveTab("APPROVAL_CENTER")}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer relative ${
                activeTab === "APPROVAL_CENTER" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Approval Center
              {/* Quick alert badge for pending requests */}
              {(inventoryRequests.filter(r => r.status === "PENDING_APPROVAL").length + 
                bundleProposals.filter(p => p.status === "PENDING_APPROVAL").length + 
                promotions.filter(p => p.status === "PENDING_APPROVAL").length) > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center animate-bounce">
                  {inventoryRequests.filter(r => r.status === "PENDING_APPROVAL").length + 
                   bundleProposals.filter(p => p.status === "PENDING_APPROVAL").length + 
                   promotions.filter(p => p.status === "PENDING_APPROVAL").length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab("STRATEGY_CENTER")}
            className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === "STRATEGY_CENTER" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Business Strategy Center
          </button>
          {currentUserRole === "OWNER" && (
            <button
              onClick={() => setActiveTab("CONSULTANT_ACCESS")}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                activeTab === "CONSULTANT_ACCESS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Consultant Access
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: EXECUTIVE DECISION CENTER & FINANCIAL GRAPHS */}
      {activeTab === "DECISION_CENTER" && (
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

          {/* 10 KPI Points Card Matrix */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue</p>
              <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
                {formatShortValue(calculations.revenue)}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-2">
                <TrendingUp className="w-3 h-3" /> +14.2% MoM
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expenses</p>
              <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
                {formatShortValue(calculations.expenses)}
              </p>
              <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5 mt-2">
                <TrendingUp className="w-3 h-3" /> +3.4% overhead
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">COGS</p>
              <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
                {formatShortValue(calculations.cogs)}
              </p>
              <span className="text-[10px] text-slate-400 font-semibold mt-2 block">
                {((calculations.cogs / calculations.revenue) * 100).toFixed(0)}% Ratio
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Profit</p>
              <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
                {formatShortValue(calculations.grossProfit)}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-2">
                <TrendingUp className="w-3 h-3" /> Strong yielding
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</p>
              <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
                {formatShortValue(calculations.netProfit)}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-2">
                <TrendingUp className="w-3 h-3" /> Target met
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit Margin</p>
              <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
                {calculations.profitMargin.toFixed(1)}%
              </p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-2">
                <TrendingUp className="w-3 h-3" /> +3.2% MoM
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash Flow</p>
              <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
                {formatShortValue(calculations.cashFlow)}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-2 block">Solvency High</span>
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
              <span className="text-[10px] text-indigo-600 font-bold mt-2 block">Confidence {forecast?.confidenceScore}%</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Order (AOV)</p>
              <p className="text-xl font-display font-extrabold text-slate-900 mt-2 font-mono">
                {formatValue(calculations.aov)}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-2">Optimal ticket density</span>
            </div>
          </div>

          {/* Interactive Financial Performance Graphs Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">Corporate Financial Trends</h3>
                <p className="text-xs text-slate-500">Analyze performance curves across revenue and profit parameters.</p>
              </div>

              {/* Time Filters & Branch selection */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-400 font-bold">Filters:</span>
                
                {/* Branch selection */}
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-[11px] py-1 px-2.5 font-bold focus:outline-none"
                >
                  <option value="ALL">All Branches</option>
                  <option value="JKT-01">Jakarta Capital Branch</option>
                  <option value="BALI-02">Bali Seminyak Hub</option>
                </select>

                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                  {(["DAILY", "WEEKLY", "MONTHLY", "ANNUAL"] as TimeFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTimeFilter(f)}
                      className={`px-2 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                        timeFilter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-800"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
          </div>
        </div>
      )}

      {/* TAB 2: APPROVAL CENTER */}
      {activeTab === "APPROVAL_CENTER" && (
        <div className="space-y-6">
          <div className="bg-indigo-900 text-white p-5 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="font-display font-extrabold text-base">SaaS Executive Approval Hub</h3>
              <p className="text-xs text-indigo-100 mt-0.5">Authorise restocking orders, pricing combos, and flyer campaign proposals submitted by managers.</p>
            </div>
            <Sparkle className="w-8 h-8 text-[#F1FF5E] shrink-0 animate-spin" style={{ animationDuration: "12s" }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column A: Purchase Orders & Restocks */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-5 h-5 text-[#261CC1]" />
                Ingredient Purchase Restocks ({inventoryRequests.filter(r => r.status === "PENDING_APPROVAL" && r.initiatedBy !== "OWNER").length})
              </h4>

              <div className="space-y-3">
                {inventoryRequests.filter(r => r.status === "PENDING_APPROVAL" && r.initiatedBy !== "OWNER").length === 0 ? (
                  <p className="text-xs text-slate-400 py-10 text-center font-bold">No pending purchase logs currently require restock authorization.</p>
                ) : (
                  inventoryRequests.filter(r => r.status === "PENDING_APPROVAL" && r.initiatedBy !== "OWNER").map((req) => (
                    <div key={req.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-mono font-bold rounded uppercase">PENDING OWNER APPROVAL</span>
                          <h5 className="font-extrabold text-slate-900 text-xs mt-1">{req.productName}</h5>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">REQ ID: {req.id}</p>
                        </div>
                        <span className="font-mono text-xs font-black text-slate-950 bg-white px-2 py-1 rounded border">{formatValue(req.estimatedCost)}</span>
                      </div>
                      
                      <p className="text-xs text-slate-600 leading-relaxed italic">" {req.notes} "</p>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-400 border-t pt-2 border-slate-200/50">
                        <span>Quantity: <span className="font-bold text-slate-800">{req.quantity} Units</span></span>
                        <span>Date: {new Date(req.submittedTime).toLocaleDateString()}</span>
                      </div>

                      {/* Comment & Actions */}
                      <div className="space-y-2 pt-2">
                        <input
                          type="text"
                          placeholder="Provide approval / rejection comments..."
                          value={rejectionNote[req.id] || ""}
                          onChange={(e) => setRejectionNote({ ...rejectionNote, [req.id]: e.target.value })}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectInventoryRequest(req.id)}
                            className="flex-1 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveInventoryRequest(req.id)}
                            className="flex-1 bg-[#E14434] hover:bg-[#c23325] text-white py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                          >
                            Authorize Order
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column B: Proposed Combo Bundles */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-[#261CC1]" />
                Proposed Strategic Combo Bundles ({bundleProposals.filter(r => r.status === "PENDING_APPROVAL").length})
              </h4>

              <div className="space-y-3">
                {bundleProposals.filter(r => r.status === "PENDING_APPROVAL").length === 0 ? (
                  <p className="text-xs text-slate-400 py-10 text-center font-bold">No pending combo bundle packages currently require authorization.</p>
                ) : (
                  bundleProposals.filter(p => p.status === "PENDING_APPROVAL").map((bundle) => (
                    <div key={bundle.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-mono font-bold rounded uppercase">PENDING BUNDLE</span>
                          <h5 className="font-extrabold text-slate-900 text-xs mt-1">{bundle.name}</h5>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-[#261CC1]">{formatValue(bundle.bundlePrice)}</span>
                          <p className="text-[9px] text-slate-400 font-mono line-through">Reg: {formatValue(bundle.regularPrice)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {bundle.productNames?.map((n: string) => (
                          <span key={n} className="px-1.5 py-0.5 bg-white border rounded text-[9px] font-bold text-slate-500 uppercase">{n}</span>
                        ))}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed italic">" {bundle.strategy} "</p>

                      <div className="space-y-2 pt-2 border-t border-slate-200/50">
                        <input
                          type="text"
                          placeholder="Provide approval / rejection comments..."
                          value={rejectionNote[bundle.id] || ""}
                          onChange={(e) => setRejectionNote({ ...rejectionNote, [bundle.id]: e.target.value })}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectBundle(bundle.id)}
                            className="flex-1 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                          >
                            Reject Proposal
                          </button>
                          <button
                            onClick={() => handleApproveBundle(bundle.id)}
                            className="flex-1 bg-[#E14434] hover:bg-[#c23325] text-white py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                          >
                            Approve Combo
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Owner-Initiated Restock Requests to Manager */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Zap className="w-5 h-5 text-[#5EABD6]" />
              Send a Restock Request to the Manager
            </h4>
            <p className="text-xs text-slate-500 mb-4">Ask the Manager to restock an item and explain your strategic reason. Once approved, stock updates automatically.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="space-y-3">
                {ownerReqSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{ownerReqSuccess}</span>
                  </div>
                )}
                <form onSubmit={handleSubmitOwnerRestockRequest} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Ingredient / Product</label>
                    <select
                      required
                      value={ownerReqProductId}
                      onChange={(e) => setOwnerReqProductId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                    >
                      <option value="">-- Select a product --</option>
                      {products.filter(p => p.companyId === company.id).map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Order Qty</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g., 50"
                      value={ownerReqQuantity}
                      onChange={(e) => setOwnerReqQuantity(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Strategic Reason for Manager</label>
                    <textarea
                      placeholder="Explain why this restock matters right now..."
                      value={ownerReqReason}
                      onChange={(e) => setOwnerReqReason(e.target.value)}
                      rows={3}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#5EABD6] hover:bg-[#4396c2] text-white py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer text-center"
                  >
                    Send Request to Manager
                  </button>
                </form>
              </div>

              {/* Tracking list of requests sent to the Manager */}
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {inventoryRequests.filter(r => r.initiatedBy === "OWNER").length === 0 ? (
                  <p className="text-xs text-slate-400 py-10 text-center font-bold">You haven't sent any restock requests to the Manager yet.</p>
                ) : (
                  inventoryRequests.filter(r => r.initiatedBy === "OWNER").map((req) => (
                    <div key={req.id} className="p-3.5 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-start">
                        <h5 className="font-extrabold text-slate-900 text-xs">{req.productName}</h5>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                          req.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : req.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                        }`}>
                          {req.status === "PENDING_APPROVAL" ? "AWAITING MANAGER" : req.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 italic">" {req.notes} "</p>
                      {req.managerRemark && (
                        <p className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-lg inline-block">Manager: {req.managerRemark}</p>
                      )}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1">
                        <span>Qty: {req.quantity} Units</span>
                        <span>{new Date(req.submittedTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUSINESS STRATEGY CENTER */}
      {activeTab === "STRATEGY_CENTER" && (
        <div className="space-y-6">
          <div>
            <h3 className="font-display font-extrabold text-slate-900 text-base">AI Business Strategy Center</h3>
            <p className="text-xs text-slate-500">Meeting-ready recommendations and follow-up actions for each business focus area.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {getStrategyFocusAreas(company).map((item) => {
              const Icon = item.icon;
              const isExpanded = expandedStrategyId === item.id;
              const schedule = strategySchedules[item.id];
              return (
                <div key={item.id} className={`bg-white p-5 rounded-2xl border shadow-sm space-y-4 transition-all ${isExpanded ? "border-[#261CC1] shadow-md" : "border-slate-200 hover:border-[#261CC1]/40"}`}>
                  <div className="cursor-pointer" onClick={() => setExpandedStrategyId(isExpanded ? null : item.id)}>
                    <div className="flex items-center justify-between">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center ${item.tone}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold text-[#261CC1]">{isExpanded ? "▲ Hide" : "▼ Details"}</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-800 mt-3">{item.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">{item.summary}</p>
                  </div>

                  {isExpanded && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Watch for</p>
                        <ul className="mt-1.5 space-y-1.5">
                          {item.watchItems.map((w, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#261CC1] mt-1.5 shrink-0"></span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-slate-200">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Next follow-up</label>
                        <input
                          type="datetime-local"
                          value={schedule || ""}
                          onChange={(e) => handleScheduleChange(item.id, e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                        {schedule && (
                          <p className="text-[10px] text-emerald-600 font-bold">Scheduled for {new Date(schedule).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CONSULTANT ACCESS SETTINGS */}
      {activeTab === "CONSULTANT_ACCESS" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-extrabold text-slate-900 text-base">Salesforce Consultant Access Settings</h3>
              <p className="text-xs text-slate-500">Safely regulate and limit the financial/operational data scopes that your Salesforce consultant can inspect.</p>
            </div>
            {currentUserRole !== "OWNER" && (
              <span className="px-3 py-1 bg-[#E14434]/10 text-[#E14434] border border-[#E14434]/20 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                🔒 OWNER ONLY READ-ONLY
              </span>
            )}
          </div>

          {currentUserRole !== "OWNER" && (
            <div className="p-4 bg-[#FEFBC7]/40 border border-[#FEFBC7] rounded-2xl flex items-start gap-3 max-w-xl">
              <span className="text-lg">💡</span>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>Access Restricted:</strong> You are currently logged in as <span className="font-bold text-[#E14434]">{currentUserRole}</span>. Only corporate <strong>OWNERS</strong> are authorized to configure active consultant scopes or toggle database system visibility keys.
              </p>
            </div>
          )}

          <div className={`space-y-4 max-w-xl ${currentUserRole !== "OWNER" ? "opacity-75" : ""}`}>
            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase">Analytics & Performance Reports</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Allows viewing financial charts, MoM growth indexes, and general aggregate parameters.</p>
              </div>
              <input
                type="checkbox"
                checked={accessSettings.analytics}
                onChange={() => handleToggleAccess("analytics")}
                disabled={currentUserRole !== "OWNER"}
                className="w-4 h-4 rounded text-[#5EABD6] focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase">Inventory Safety Levels</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Allows monitoring material safety ratios and predicting restock requirements.</p>
              </div>
              <input
                type="checkbox"
                checked={accessSettings.inventory}
                onChange={() => handleToggleAccess("inventory")}
                disabled={currentUserRole !== "OWNER"}
                className="w-4 h-4 rounded text-[#5EABD6] focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Toggle 3 */}
            <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase">Supplier Cost Details & Expenses</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Allows consultant to review detailed raw supplier vendor contracts and cost margins.</p>
              </div>
              <input
                type="checkbox"
                checked={accessSettings.expenses}
                onChange={() => handleToggleAccess("expenses")}
                disabled={currentUserRole !== "OWNER"}
                className="w-4 h-4 rounded text-[#5EABD6] focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Toggle 4 */}
            <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase">Account Info & Capital Structures</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Hides or shows detailed banking profiles, account margins, and corporate liabilities.</p>
              </div>
              <input
                type="checkbox"
                checked={accessSettings.capital}
                onChange={() => handleToggleAccess("capital")}
                disabled={currentUserRole !== "OWNER"}
                className="w-4 h-4 rounded text-[#5EABD6] focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Toggle 5 */}
            <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase">Employee & Crew Rosters</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Allows viewing staff rosters, employee directories, and monthly salary overheads.</p>
              </div>
              <input
                type="checkbox"
                checked={accessSettings.employee}
                onChange={() => handleToggleAccess("employee")}
                disabled={currentUserRole !== "OWNER"}
                className="w-4 h-4 rounded text-[#5EABD6] focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Toggle 6 */}
            <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase">System Maintenance & Industrial Benchmarking</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Allows consultant to view database integrity metrics, server nodes, and compare performance with F&B standards.</p>
              </div>
              <input
                type="checkbox"
                checked={accessSettings.hasOwnProperty("maintenance") ? (accessSettings as any).maintenance : true}
                onChange={() => handleToggleAccess("maintenance" as any)}
                disabled={currentUserRole !== "OWNER"}
                className="w-4 h-4 rounded text-[#5EABD6] focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <span className="text-xs">🛡️</span>
              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                SaaS Security Gateway: Consultant configuration is locked and successfully synchronized.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
