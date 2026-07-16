/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Company, Product, InventoryLog, Promotion, Currency } from "../types";
import { EXCHANGE_RATE } from "../mockData";
import { apiPost, apiPatch, apiDelete } from "../api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
  PieChart,
  Pie
} from "recharts";
import {
  CheckCircle,
  XCircle,
  Warehouse,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Image as ImageIcon,
  Flame,
  LayoutGrid,
  PlusCircle,
  Clock,
  MessageSquare,
  MinusCircle,
  DollarSign,
  Users,
  Activity,
  ShieldAlert,
  Pencil,
  Trash2,
  Check,
  X,
  Plus
} from "lucide-react";
import ManagerFileUploader from "./ManagerFileUploader";
import ManagerComboCreator from "./ManagerComboCreator";
import ManagerFlyerUpload from "./ManagerFlyerUpload";

interface SafetyProduct extends Omit<Product, "status"> {
  targetTemp: string;
  actualTemp: number;
  score: number;
  status: "SAFE" | "WARN" | "UNSAFE";
  alertReason: string;
}

const getSafetyDiagnostics = (products: Product[]): SafetyProduct[] => {
  return products.map(p => {
    const seed = p.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let targetTemp = "Room (20-25Â°C)";
    let actualTemp = 22.4;
    const category = p.category.toLowerCase();
    
    if (category.includes("coffee") || category.includes("bean") || category.includes("bubuk") || category.includes("sirup")) {
      targetTemp = "Room Temperature (20-25Â°C)";
      actualTemp = 21.0 + (seed % 40) / 10;
    } else if (category.includes("susu") || category.includes("dairy") || category.includes("cream") || category.includes("keju") || category.includes("mentega")) {
      targetTemp = "Cold (2-4Â°C)";
      actualTemp = 2.0 + (seed % 65) / 10;
    } else if (category.includes("salmon") || category.includes("daging") || category.includes("meat") || category.includes("ayam") || category.includes("frozen")) {
      targetTemp = "Frozen (<-18Â°C)";
      actualTemp = -22.0 + (seed % 80) / 10;
    } else {
      targetTemp = "Cold (2-8Â°C)";
      actualTemp = 3.0 + (seed % 70) / 10;
    }

    let score = 95 - (seed % 15);
    let status: "SAFE" | "WARN" | "UNSAFE" = "SAFE";
    let alertReason = "Optimal temperature and cold chain maintained";

    if (targetTemp.includes("Cold") && actualTemp > 5.5) {
      score = 65 - (seed % 10);
      status = "WARN";
      alertReason = `Fridge temperature rose to ${actualTemp.toFixed(1)}Â°C (max 4Â°C)`;
    }
    if (targetTemp.includes("Frozen") && actualTemp > -15.0) {
      score = 45 - (seed % 15);
      status = "UNSAFE";
      alertReason = `Freezer critically warm at ${actualTemp.toFixed(1)}Â°C (frozen chain disrupted)`;
    }
    if (p.name.includes("Durian") || p.name.includes("Salmon") || p.name.includes("Susu") || p.name.includes("Cheese")) {
      if (seed % 3 === 0) {
        score = 38;
        status = "UNSAFE";
        alertReason = "Critical hygiene alert: sensor lab report detected humidity above HACCP standards";
      } else if (seed % 3 === 1) {
        score = 68;
        status = "WARN";
        alertReason = "Nearing freshness shelf-life limit (24 hours left)";
      }
    }

    return {
      ...p,
      targetTemp,
      actualTemp,
      score,
      status,
      alertReason
    };
  });
};

interface ManagerDashboardProps {
  company: Company;
  products: Product[];
  inventoryLogs: InventoryLog[];
  promotions: Promotion[];
  currency: Currency;
  onApproveInventoryLog: (logId: string) => void;
  onRejectInventoryLog: (logId: string) => void;
  onApprovePromotion: (promoId: string) => void;
  onDataChanged?: () => void;
}

type TabType = "INVENTORY" | "REQUEST_CENTER" | "PRODUCT_MANAGER" | "SPREADSHEET_FEED" | "CUSTOMER_GUESS";
type ProductSubTab = "MENU" | "COMBOS" | "FLYERS";

export default function ManagerDashboard({
  company,
  products: propProducts,
  inventoryLogs,
  promotions,
  currency,
  onApproveInventoryLog,
  onRejectInventoryLog,
  onApprovePromotion,
  onDataChanged,
}: ManagerDashboardProps) {
  
  const [activeTab, setActiveTab] = useState<TabType>("INVENTORY");
  const [productSubTab, setProductSubTab] = useState<ProductSubTab>("MENU");

  // Local state for products to support manager's live inventory editor
  const [localProducts, setLocalProducts] = useState<Product[]>(propProducts);

  // Real, data-derived operational health stats (replaces hardcoded per-company copy)
  const healthStats = useMemo(() => {
    const totalCount = localProducts.length;
    const healthyCount = localProducts.filter((p) => p.status === "IN_STOCK").length;
    const riskCount = localProducts.filter((p) => p.status === "LOW_STOCK" || p.status === "OUT_OF_STOCK").length;
    const stabilityPercent = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100;
    const totalMarginPercent = localProducts.reduce((sum, p) => sum + (p.price > 0 ? ((p.price - p.cogs) / p.price) * 100 : 0), 0);
    const avgMargin = totalCount > 0 ? totalMarginPercent / totalCount : 0;
    const topProduct = [...localProducts].sort((a, b) => b.salesCount - a.salesCount)[0];
    return { totalCount, healthyCount, riskCount, stabilityPercent, avgMargin, topProduct };
  }, [localProducts]);

  // Safety Diagnostics toast state
  const [safetyToast, setSafetyToast] = useState<{ type: "success" | "warning"; text: string } | null>(null);

  // Action handler for food safety status
  const handleSafetyAction = (productId: string, action: "DISCARD" | "CALIBRATE", productName: string) => {
    if (action === "DISCARD") {
      const updated = localProducts.map(p => 
        p.id === productId ? { ...p, stock: 0, status: "OUT_OF_STOCK" as const } : p
      );
      setLocalProducts(updated);
      setSafetyToast({
        type: "warning",
        text: `âš ï¸ [SAFELY DISCARDED] Batch "${productName}" was pulled and discarded per F&B HACCP regulations.`
      });
    } else {
      setSafetyToast({
        type: "success",
        text: `âœ… [CALIBRATION COMPLETE] Smart sensors and compressor for "${productName}" have been recalibrated to the optimal temperature.`
      });
    }
    setTimeout(() => {
      setSafetyToast(null);
    }, 5000);
  };
  
  // Form states for creating a new product
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdMinStock, setNewProdMinStock] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Espresso Drinks");

  // Direct Restocking states (no request needed)
  const [restockProductId, setRestockProductId] = useState("");
  const [restockQty, setRestockQty] = useState("");

  // Analysis sort state
  const [demandFilter, setDemandFilter] = useState<"ALL" | "HIGH" | "STEADY" | "LOW">("ALL");
  const [sortByMargin, setSortByMargin] = useState(false);

  const demandSummary = useMemo(() => {
    const high = localProducts.filter((p) => p.salesCount >= 80).length;
    const steady = localProducts.filter((p) => p.salesCount >= 25 && p.salesCount < 80).length;
    const low = localProducts.filter((p) => p.salesCount < 25).length;
    return { high, steady, low };
  }, [localProducts]);

  // Form states for submitting restocking request
  const [reqProductId, setReqProductId] = useState("");
  const [reqQuantity, setReqQuantity] = useState("");
  const [reqCost, setReqCost] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [reqSuccess, setReqSuccess] = useState("");

  // Track inventory request list (both Manager-to-Owner and Owner-to-Manager requests)
  const [submittedRequests, setSubmittedRequests] = useState<any[]>([]);
  const [ownerReqRemark, setOwnerReqRemark] = useState<{ [reqId: string]: string }>({});

  // Customer Guess & Feedback states
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsSortFilter, setReviewsSortFilter] = useState<"ALL" | "HIGH_MARGIN" | "SEPI">("ALL");
  const [aiDraftReplies, setAiDraftReplies] = useState<{ [revId: string]: string }>({});
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);

  // Sync reviews
  useEffect(() => {
    const checkReviews = () => {
      const stored = localStorage.getItem("aibispro_reviews");
      if (stored) {
        try {
          setReviews(JSON.parse(stored).filter((r: any) => r.companyId === company.id));
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkReviews();
    const interval = setInterval(checkReviews, 1500);
    return () => clearInterval(interval);
  }, [company.id]);

  // Load local state and requests
  useEffect(() => {
    // 1. Sync custom products
    const storedProds = localStorage.getItem("aibispro_products");
    if (storedProds) {
      try {
        setLocalProducts(JSON.parse(storedProds).filter((p: any) => p.companyId === company.id));
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem("aibispro_products", JSON.stringify(propProducts));
    }

    // 2. Ensure the manager view follows the latest shared product state
    setLocalProducts(propProducts.filter((p) => p.companyId === company.id));

    // 3. Sync inventory purchase requests
    const syncRequests = () => {
      const stored = localStorage.getItem("aibispro_inventory_requests");
      if (stored) {
        try {
          setSubmittedRequests(JSON.parse(stored).filter((r: any) => r.companyId === company.id));
        } catch (e) {
          console.error(e);
        }
      }
    };
    syncRequests();
    const interval = setInterval(syncRequests, 2000);
    return () => clearInterval(interval);
  }, [company.id, propProducts]);

  // Handle direct cash transaction deduction
  const handleRecordTransaction = (productId: string, quantity: number) => {
    const stored = localStorage.getItem("aibispro_products");
    if (stored) {
      try {
        const parsed: Product[] = JSON.parse(stored);
        const updated = parsed.map((p) => {
          if (p.id === productId) {
            const newStock = Math.max(0, p.stock - quantity);
            return {
              ...p,
              stock: newStock,
              salesCount: p.salesCount + quantity,
              status: newStock === 0 ? "OUT_OF_STOCK" : newStock <= p.minStock ? "LOW_STOCK" : "IN_STOCK"
            } as Product;
          }
          return p;
        });
        localStorage.setItem("aibispro_products", JSON.stringify(updated));
        setLocalProducts(updated.filter((p) => p.companyId === company.id));
        alert(`Recorded direct sales of ${quantity} units. Ingredient inventory successfully deducted.`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Add new menu item - creates a real product + its first size directly in the database.
  const [newProdCogs, setNewProdCogs] = useState("");
  const [showAddMenuForm, setShowAddMenuForm] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [addProductError, setAddProductError] = useState("");

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !newProdStock || !newProdMinStock) return;
    setIsSavingProduct(true);
    setAddProductError("");
    try {
      await apiPost("/products", {
        name: newProdName,
        company_id: Number(company.id),
        category_name: newProdCategory || undefined,
        size_name: "Regular",
        selling_price: parseFloat(newProdPrice),
        cost_price: newProdCogs ? parseFloat(newProdCogs) : Math.round(parseFloat(newProdPrice) * 0.35),
        current_stock: parseInt(newProdStock, 10),
        minimum_stock: parseInt(newProdMinStock, 10),
      });

      setNewProdName("");
      setNewProdPrice("");
      setNewProdCogs("");
      setNewProdStock("");
      setNewProdMinStock("");
      setShowAddMenuForm(false);
      onDataChanged?.();
    } catch (err: any) {
      setAddProductError(err?.message ?? "Failed to add menu item.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Edit an existing menu item's name/category/price/cost/stock levels.
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCogs, setEditCogs] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editMinStock, setEditMinStock] = useState("");

  const startEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setEditName(p.name.replace(/\s*\([^)]*\)\s*$/, "")); // strip trailing "(R)"/"(L)" size suffix for editing the base name
    setEditCategory(p.category);
    setEditPrice(String(p.price));
    setEditCogs(String(p.cogs));
    setEditStock(String(p.stock));
    setEditMinStock(String(p.minStock));
  };

  const cancelEditProduct = () => setEditingProductId(null);

  const saveEditProduct = async (p: Product) => {
    if (p.productId === undefined || p.sizeId === undefined) return;
    setIsSavingProduct(true);
    try {
      await Promise.all([
        apiPatch(`/products/${p.productId}`, { name: editName, category_name: editCategory || undefined }),
        apiPatch(`/inventory/${p.sizeId}`, {
          selling_price: parseFloat(editPrice),
          cost_price: parseFloat(editCogs),
          current_stock: parseInt(editStock, 10),
          minimum_stock: parseInt(editMinStock, 10),
        }),
      ]);
      setEditingProductId(null);
      onDataChanged?.();
    } catch (err) {
      console.error("Failed to save menu item:", err);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Remove a menu item from the active menu (soft delete - keeps historical sales intact).
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const handleDeleteProduct = async (p: Product) => {
    if (p.productId === undefined) return;
    setIsDeletingProduct(true);
    try {
      await apiDelete(`/products/${p.productId}`);
      setConfirmDeleteProductId(null);
      onDataChanged?.();
    } catch (err) {
      console.error("Failed to remove menu item:", err);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Submit restocking purchase order request to Owner
  const handleRequestRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqProductId || !reqQuantity || !reqCost) return;
    const prod = localProducts.find((p) => p.id === reqProductId);
    if (!prod) return;

    const newRequest = {
      id: `REQ-${Date.now().toString().slice(-3)}`,
      companyId: company.id,
      productId: prod.id,
      productName: prod.name,
      quantity: parseInt(reqQuantity),
      estimatedCost: parseFloat(reqCost),
      notes: reqNotes || "Urgent ingredient replenishment required.",
      submittedTime: new Date().toISOString(),
      status: "PENDING_APPROVAL",
      initiatedBy: "MANAGER",
      rejectReason: ""
    };

    const stored = localStorage.getItem("aibispro_inventory_requests") || "[]";
    try {
      const parsed = JSON.parse(stored);
      const updated = [newRequest, ...parsed];
      localStorage.setItem("aibispro_inventory_requests", JSON.stringify(updated));
      setSubmittedRequests(updated.filter((r: any) => r.companyId === company.id));

      // Reset
      setReqProductId("");
      setReqQuantity("");
      setReqCost("");
      setReqNotes("");
      setReqSuccess("Purchase order submitted successfully to Owner's approval queue!");
      setTimeout(() => setReqSuccess(""), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Respond to a restock request that the Owner sent directly to the Manager
  const handleRespondOwnerRequest = (reqId: string, action: "APPROVED" | "REJECTED") => {
    const stored = localStorage.getItem("aibispro_inventory_requests");
    if (!stored) return;
    try {
      const parsed: any[] = JSON.parse(stored);
      const target = parsed.find((r) => r.id === reqId);
      if (!target) return;

      const remark = ownerReqRemark[reqId] || (action === "APPROVED" ? "Restocked as requested." : "Unable to fulfill this request right now.");
      const updated = parsed.map((r) => (r.id === reqId ? { ...r, status: action, managerRemark: remark } : r));
      localStorage.setItem("aibispro_inventory_requests", JSON.stringify(updated));
      setSubmittedRequests(updated.filter((r) => r.companyId === company.id));

      if (action === "APPROVED") {
        const storedProducts = localStorage.getItem("aibispro_products");
        if (storedProducts) {
          const parsedProds = JSON.parse(storedProducts);
          const updatedProds = parsedProds.map((p: any) => {
            if (p.id === target.productId) {
              const newStock = p.stock + target.quantity;
              return { ...p, stock: newStock, status: newStock > p.minStock ? "IN_STOCK" : "LOW_STOCK" };
            }
            return p;
          });
          localStorage.setItem("aibispro_products", JSON.stringify(updatedProds));
          setLocalProducts(updatedProds.filter((p: any) => p.companyId === company.id));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct Restocking handler - writes straight to the real product_sizes.current_stock via
  // the inventory API (no approval step, per Owner policy for this "instant" restock path).
  const [isRestocking, setIsRestocking] = useState(false);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState("");

  const handleDirectRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProductId || !restockQty) return;
    const qty = parseInt(restockQty, 10);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid restocking quantity.");
      return;
    }
    const target = localProducts.find((p) => p.id === restockProductId);
    if (!target || target.sizeId === undefined) return;

    setIsRestocking(true);
    setRestockSuccessMsg("");
    try {
      await apiPost("/inventory/stock-in", {
        product_size_id: target.sizeId,
        quantity: qty,
        notes: "Direct manager stock replenishment (Instant Restock Center).",
      });
      setRestockSuccessMsg(`Confirmed in database: "${target.name}" stock is now ${target.stock + qty} units (+${qty}).`);
      setRestockQty("");
      setRestockProductId("");
      onDataChanged?.();
      setTimeout(() => setRestockSuccessMsg(""), 6000);
    } catch (err) {
      console.error("Failed to restock:", err);
      alert("Failed to update stock. Please try again.");
    } finally {
      setIsRestocking(false);
    }
  };

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

  // Filter logs for active company
  const companyLogs = inventoryLogs.filter((l) => l.companyId === company.id);
  const pendingLogs = companyLogs.filter((l) => l.status === "PENDING_APPROVAL");

  // Filter promotions for active company
  const companyPromotions = promotions.filter((p) => p.companyId === company.id);
  const pendingPromos = companyPromotions.filter((p) => p.status === "PENDING_APPROVAL");

  // Stock counters
  const lowStockProducts = localProducts.filter((p) => p.status === "LOW_STOCK");
  const outOfStockProducts = localProducts.filter((p) => p.status === "OUT_OF_STOCK");
  const safetyProducts = getSafetyDiagnostics(localProducts);

  return (
    <div className="space-y-6 relative pb-16">
      
      {/* Top Welcome Summary Banner */}
      <div className="bg-gradient-to-r from-[#5EABD6] to-[#FFB4B4] text-slate-900 p-6 rounded-3xl border border-[#5EABD6]/20 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,rgba(254,251,199,0.4),transparent)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#E14434] text-white font-mono tracking-wider">
              Manager Operations Workspace
            </span>
            <h2 className="text-xl font-display font-black text-slate-950 mt-1.5">{company.avatarUrl} {company.name} Hub</h2>
            <p className="text-xs text-slate-800 font-medium">Authorize ingredient levels, log direct transactions, draft combos, and submit purchase orders.</p>
          </div>
          
          <div className="flex gap-4 text-xs font-mono">
            <div className="bg-white/80 border border-white/90 px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-[#E14434] font-black">{pendingLogs.length}</span> <span className="text-slate-700 font-bold">Logs Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview stats block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catalog Size</p>
          <p className="text-xl font-display font-black text-slate-900 mt-1 font-mono">
            {localProducts.length} Products
          </p>
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Active Menu Assets</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock</p>
          <p className="text-xl font-display font-black text-amber-600 mt-1 font-mono">
            {lowStockProducts.length} Products
          </p>
          <span className="text-[10px] text-amber-500 font-bold uppercase animate-pulse">Needs restocking</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Out of Stock</p>
          <p className="text-xl font-display font-black text-red-600 mt-1 font-mono">
            {outOfStockProducts.length} Items
          </p>
          <span className="text-[10px] text-red-500 font-semibold uppercase">Critically depleted</span>
        </div>

        <div className="bg-[#FEFBC7] border border-[#FEFBC7] text-slate-800 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Purchase Requests</p>
          <p className="text-xl font-display font-black text-[#E14434] mt-1 font-mono">
            {submittedRequests.filter(r => r.status === "PENDING_APPROVAL").length} Pending
          </p>
          <span className="text-[10px] text-slate-500 font-bold uppercase">Awaiting Owner Approval</span>
        </div>
      </div>

      {/* Operational Health & Sustainability Monitor */}
      <div className="bg-[#FEFBC7]/40 text-slate-800 rounded-2xl p-6 border border-[#FEFBC7] shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,rgba(94,171,214,0.15),transparent)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#FEFBC7]/80 pb-4 mb-4">
          <div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#E14434] text-white font-mono tracking-wider">
              BI Sustainability & Risk Monitor
            </span>
            <h3 className="text-base font-display font-black text-slate-900 mt-1">
              Active Store Health & Operational Status
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">Store Status:</span>
            <span className={`px-2.5 py-1 rounded-full font-mono text-xs font-black uppercase ${
              healthStats.stabilityPercent >= 80
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : healthStats.stabilityPercent >= 50
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200 animate-pulse"
            }`}>
              {healthStats.stabilityPercent >= 80 ? "EXCELLENT & SUSTAINABLE" : healthStats.stabilityPercent >= 50 ? "STABLE & SUSTAINABLE" : "WARNING: STOCK RISK"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-white rounded-xl border border-[#FEFBC7]/80 shadow-xs">
            <p className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Stability Rating</p>
            <p className={`text-sm font-black mt-1 ${healthStats.stabilityPercent < 50 ? "text-rose-600" : "text-emerald-600"}`}>
              {healthStats.stabilityPercent}% {healthStats.stabilityPercent >= 80 ? "Secure" : healthStats.stabilityPercent >= 50 ? "Safe" : "Fluctuation Risk"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Based on {healthStats.healthyCount}/{healthStats.totalCount} products in healthy stock.</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#FEFBC7]/80 shadow-xs">
            <p className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Sustainability Index</p>
            <p className="text-sm font-black mt-1 text-slate-800">
              {healthStats.avgMargin >= 50 ? "High Continuity" : healthStats.avgMargin >= 30 ? "Moderate (COGS Pressure)" : "Tight Margins"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Avg. gross margin: {healthStats.avgMargin.toFixed(0)}% across catalog.</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#FEFBC7]/80 shadow-xs">
            <p className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Active Growth Opportunity</p>
            <p className="text-sm font-black mt-1 text-[#E14434] truncate" title={healthStats.topProduct?.name}>
              {healthStats.topProduct ? healthStats.topProduct.name : "No sales data yet"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Top demand product ({healthStats.topProduct?.salesCount ?? 0} projected units).</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#FEFBC7]/80 shadow-xs">
            <p className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Risks & Bottlenecks</p>
            <p className={`text-sm font-black mt-1 ${healthStats.riskCount > 0 ? "text-rose-600" : "text-amber-600"}`}>
              {healthStats.riskCount > 0 ? `${healthStats.riskCount} item(s) low/out of stock` : "No active stock risks"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Tracked via real-time safety stock alerts.</p>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("INVENTORY")}
          className={`pb-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "INVENTORY" ? "border-[#E14434] text-[#E14434]" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Inventory Approvals</span>
        </button>

        <button
          onClick={() => setActiveTab("REQUEST_CENTER")}
          className={`pb-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "REQUEST_CENTER" ? "border-[#E14434] text-[#E14434]" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Inventory Request Center</span>
        </button>

        <button
          onClick={() => setActiveTab("PRODUCT_MANAGER")}
          className={`pb-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "PRODUCT_MANAGER" ? "border-[#E14434] text-[#E14434]" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Product & Stock Manager</span>
        </button>

        <button
          onClick={() => setActiveTab("SPREADSHEET_FEED")}
          className={`pb-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "SPREADSHEET_FEED" ? "border-[#E14434] text-[#E14434]" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Spreadsheet Feed Upload</span>
        </button>

        <button
          onClick={() => setActiveTab("CUSTOMER_GUESS")}
          className={`pb-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "CUSTOMER_GUESS" ? "border-[#E14434] text-[#E14434]" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer Guess & Feedback</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        
        {/* PANEL 1: INVENTORY APPROVALS & STOCKS */}
        {activeTab === "INVENTORY" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            <div className="lg:col-span-2 space-y-6">
              {/* Restocking Signoffs */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-[#5EABD6]/10 text-[#5EABD6] rounded-xl">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-slate-900 text-base">Material Restocking Signoffs</h3>
                    <p className="text-xs text-slate-500">Review and authorize ingredient log entries submitted by branch crew members.</p>
                  </div>
                </div>

                <div className="mt-6">
                  {pendingLogs.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
                      <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2.5" />
                      <p className="font-bold text-sm text-slate-800">All Clear!</p>
                      <p className="text-xs text-slate-400 mt-1">No pending restocking requests currently need signatures.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingLogs.map((log) => (
                        <div key={log.id} className="p-4 border border-indigo-100 bg-slate-50/40 hover:bg-slate-50 hover:border-[#5EABD6]/30 transition-all rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 font-mono font-black rounded text-[9px] uppercase tracking-wider">PENDING SIGNOFF</span>
                              <span className="font-mono text-[10px] text-slate-400">{log.id}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 mt-2">{log.productName}</p>
                            <p className="text-xs text-slate-600 italic mt-1 bg-white border border-slate-100 p-2 rounded-lg">" {log.notes} "</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => onRejectInventoryLog(log.id)}
                              className="p-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all cursor-pointer"
                              title="Tolak Request"
                            >
                              <XCircle className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => onApproveInventoryLog(log.id)}
                              className="bg-[#E14434] hover:bg-[#c23325] text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            >
                              <CheckCircle className="w-4.5 h-4.5" /> Signoff Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Promotions validation */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-[#5EABD6]/10 text-[#5EABD6] rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-slate-900 text-base">Campaign & Promotion Auditing</h3>
                    <p className="text-xs text-slate-500">Draft, review, or authorize pricing discount campaign items.</p>
                  </div>
                </div>

                <div className="mt-6">
                  {pendingPromos.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      No marketing campaign proposals require validation.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingPromos.map((p) => (
                        <div key={p.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/30 hover:bg-slate-50 hover:border-[#5EABD6]/30 transition-all flex items-center justify-between gap-4">
                          <div>
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 font-mono text-[9px] rounded font-black uppercase tracking-wider">Awaiting Auth</span>
                            <h4 className="text-sm font-bold text-slate-900 mt-2">{p.name}</h4>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">Rate: <span className="font-bold text-[#5EABD6]">{p.discountPercent}% Discount</span></p>
                          </div>
                          <button
                            onClick={() => onApprovePromotion(p.id)}
                            className="bg-[#E14434] text-white px-4 py-2 text-xs font-black rounded-xl hover:bg-[#c23325] transition-all cursor-pointer shadow-sm shrink-0"
                          >
                            Approve Campaign
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Safety Stock Monitor */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 h-fit">
              <div>
                <h3 className="font-display font-black text-slate-900 text-base flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-[#5EABD6]" />
                  Safety Stock Monitor
                </h3>
                <p className="text-xs text-slate-500">Live safety triggers for ingredient levels.</p>
              </div>

              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {localProducts.map((p) => {
                  const percent = Math.min((p.stock / p.minStock) * 100, 100);
                  const isLow = p.status === "LOW_STOCK";
                  const isOut = p.status === "OUT_OF_STOCK";

                  return (
                    <div key={p.id} className="p-3.5 border border-slate-100 rounded-2xl bg-slate-50/20 hover:bg-slate-50 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-black text-slate-900">{p.name}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-black mt-0.5">{p.category}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs ${
                          isOut ? "bg-rose-50 text-rose-700 border border-rose-100" : isLow ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>{p.stock} porsi</span>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1.5">
                          <span>Min Safety: <strong className="text-slate-700">{p.minStock}</strong></span>
                          <span>Rasio: <strong className={isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-600"}>{percent.toFixed(0)}%</strong></span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOut ? "bg-rose-500" : isLow ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: INVENTORY REQUEST CENTER */}
        {activeTab === "REQUEST_CENTER" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Purchase Request Form */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-sm uppercase tracking-wider">Submit Restock Purchase Order</h3>
                <p className="text-xs text-slate-500">Submit restocking items directly to the Owner's approval board.</p>
              </div>

              {reqSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{reqSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRequestRestockSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Ingredient / Product</label>
                  <select
                    required
                    value={reqProductId}
                    onChange={(e) => setReqProductId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                  >
                    <option value="">-- Select a product --</option>
                    {localProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Order Qty</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g., 50"
                      value={reqQuantity}
                      onChange={(e) => setReqQuantity(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Total Cost (IDR)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g., 5750000"
                      value={reqCost}
                      onChange={(e) => setReqCost(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Reason / Notes for Owner</label>
                  <textarea
                    placeholder="Provide operational context or peak demand forecasts..."
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#E14434] hover:bg-[#c23325] text-white py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer text-center"
                >
                  Submit Order Proposal
                </button>
              </form>
            </div>

            {/* Right: Submitted request tracking list */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-sm uppercase tracking-wider">Submitted Requests Tracking Board</h3>
                <p className="text-xs text-slate-500">Live feed of restock requests between you and the Owner, with reasons and remarks from both sides.</p>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {submittedRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 py-20 text-center font-bold">No purchase orders submitted yet.</p>
                ) : (
                  submittedRequests.map((req) => {
                    const isFromOwner = req.initiatedBy === "OWNER";
                    const isActionable = isFromOwner && req.status === "PENDING_APPROVAL";

                    return (
                      <div key={req.id} className={`p-4 border rounded-xl space-y-2 ${isActionable ? "border-[#5EABD6]/50 bg-[#5EABD6]/5" : "border-slate-100 bg-slate-50/50"}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                                isFromOwner ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}>
                                {isFromOwner ? "Owner â†’ You" : "You â†’ Owner"}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                                req.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : req.status === "REJECTED"
                                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                                    : "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                              }`}>
                                {req.status === "PENDING_APPROVAL" ? "PENDING" : req.status}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-xs mt-1.5">{req.productName}</h4>
                            <span className="text-[9px] font-mono text-slate-400">{req.id}</span>
                          </div>
                          <span className="font-mono text-xs font-black text-slate-950 bg-white px-2 py-0.5 rounded border">{formatValue(req.estimatedCost)}</span>
                        </div>

                        <p className="text-xs text-slate-600 italic">" {req.notes} "</p>

                        {req.rejectReason && (
                          <div className="p-2.5 bg-white border border-rose-100 rounded-lg text-[11px] text-rose-700 font-bold">
                            Owner remarks: {req.rejectReason}
                          </div>
                        )}
                        {req.managerRemark && (
                          <div className="p-2.5 bg-white border border-emerald-100 rounded-lg text-[11px] text-emerald-700 font-bold">
                            Your remarks: {req.managerRemark}
                          </div>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono border-t pt-2 border-slate-100">
                          <span>Quantity: {req.quantity} Units</span>
                          <span>Date: {new Date(req.submittedTime).toLocaleDateString()}</span>
                        </div>

                        {isActionable && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <input
                              type="text"
                              placeholder="Add a quick remark (optional)..."
                              value={ownerReqRemark[req.id] || ""}
                              onChange={(e) => setOwnerReqRemark({ ...ownerReqRemark, [req.id]: e.target.value })}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRespondOwnerRequest(req.id, "REJECTED")}
                                className="flex-1 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleRespondOwnerRequest(req.id, "APPROVED")}
                                className="flex-1 bg-[#5EABD6] hover:bg-[#4396c2] text-white py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                              >
                                Approve & Restock
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* PANEL 3: PRODUCT & STOCK MANAGER */}
        {activeTab === "PRODUCT_MANAGER" && (
          <div className="space-y-5">
            {/* Product & Stock Manager sub-navigation: Menu/Stock, Combo Bundles, and Promo Flyers
                all live in one place now instead of being separate top-level tabs. */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => setProductSubTab("MENU")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  productSubTab === "MENU" ? "bg-white text-[#E14434] shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Menu & Stock</span>
              </button>
              <button
                onClick={() => setProductSubTab("COMBOS")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  productSubTab === "COMBOS" ? "bg-white text-[#E14434] shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Combo Bundles</span>
              </button>
              <button
                onClick={() => setProductSubTab("FLYERS")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  productSubTab === "FLYERS" ? "bg-white text-[#E14434] shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Promo Flyers</span>
              </button>
            </div>

            {productSubTab === "COMBOS" && (
              <ManagerComboCreator company={company} products={localProducts} currency={currency} />
            )}

            {productSubTab === "FLYERS" && (
              <ManagerFlyerUpload company={company} promotions={promotions} />
            )}

            {productSubTab === "MENU" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column Stack */}
            <div className="lg:col-span-1 space-y-6">

              {/* Quick Restock Center */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5EABD6] animate-ping"></span>
                    <span className="text-[10px] font-black uppercase text-[#5EABD6] tracking-wider font-mono">Bypass Approval Restock</span>
                  </div>
                  <h3 className="font-display font-black text-slate-950 text-base mt-1">Instant Restock Center</h3>
                  <p className="text-xs text-slate-500 mt-1">Per Owner policy, this restock is self-service and updates stock immediately without approval.</p>
                </div>

                <form onSubmit={handleDirectRestockSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Select Menu / Product</label>
                    <select
                      required
                      value={restockProductId}
                      onChange={(e) => setRestockProductId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                    >
                      <option value="">-- Select an item to restock --</option>
                      {localProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Current stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Restock Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g., 50"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isRestocking}
                    className="w-full bg-[#E14434] hover:bg-[#c23325] text-white py-3 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRestocking ? "Updating..." : "Update Stock Now"}
                  </button>

                  {restockSuccessMsg && (
                    <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-emerald-800">{restockSuccessMsg}</p>
                    </div>
                  )}
                </form>

                {/* Quick statistics summary */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">Quick Stock Alerts</p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Low Stock Items:</span>
                    <span className="font-bold text-amber-600">{localProducts.filter(p => p.stock <= p.minStock && p.stock > 0).length} Menu</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Out of Stock Items:</span>
                    <span className="font-bold text-rose-600">{localProducts.filter(p => p.stock === 0).length} Menu</span>
                  </div>
                </div>
              </div>

              {/* Stock Safety Status Chart Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-display font-black text-slate-950 text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4.5 h-4.5 text-[#E14434]" />
                    Menu Safety Analysis
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Visual daily stock status for active menu and drink items.</p>
                </div>

                <div className="h-[210px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={localProducts.map(p => ({
                        shortName: p.name.length > 12 ? p.name.substring(0, 12) + ".." : p.name,
                        fullName: p.name,
                        stok: p.stock,
                        minStok: p.minStock,
                        status: p.stock === 0 ? "Critical" : p.stock <= p.minStock ? "Low" : "Safe"
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
                    >
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis dataKey="shortName" type="category" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#1e293b' }} width={85} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-950 text-white p-3 rounded-xl text-[10px] space-y-1.5 font-sans border border-slate-800 shadow-xl max-w-[200px]">
                                <p className="font-black text-slate-200 leading-tight">{data.fullName}</p>
                                <div className="border-t border-slate-800 pt-1 mt-1 space-y-1">
                                  <p className="text-slate-400">Current Stock: <span className="font-black text-white text-xs">{data.stok} unit</span></p>
                                  <p className="text-slate-400">Min. Safety Level: <span className="font-bold text-slate-300">{data.minStok} unit</span></p>
                                </div>
                                <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[9px] font-black uppercase ${
                                  data.status === "Safe" ? "bg-emerald-500/20 text-emerald-400" : data.status === "Low" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"
                                }`}>
                                  Status: {data.status}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="stok" radius={[0, 6, 6, 0]} barSize={14}>
                        {localProducts.map((p, idx) => {
                          const isOut = p.stock === 0;
                          const isLow = p.stock <= p.minStock;
                          const color = isOut 
                            ? "#ef4444" // red
                            : isLow 
                              ? "#f59e0b" // amber
                              : "#10b981"; // emerald
                          return <Cell key={`cell-${idx}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Safe</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>Critical/Out</span>
                  </div>
                </div>
              </div>

            </div>

            {/* List, Performance Analysis, and AI Demand Timings */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col gap-3 border-b pb-4 border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-black text-slate-950 text-base">Menu Performance & Demand</h3>
                    <p className="text-xs text-slate-500">See which items are healthy, risky, or worth improving at a glance.</p>
                  </div>
                  <button
                    onClick={() => setShowAddMenuForm((v) => !v)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-black rounded-xl transition-all cursor-pointer shrink-0 ${
                      showAddMenuForm ? "bg-slate-200 text-slate-700" : "bg-[#261CC1] hover:bg-[#1C0770] text-white shadow-sm"
                    }`}
                  >
                    {showAddMenuForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showAddMenuForm ? "Cancel" : "Add New Menu Item"}
                  </button>
                </div>

                {showAddMenuForm && (
                  <form onSubmit={handleAddProduct} className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl">
                    <div className="col-span-2 sm:col-span-3 space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500">Item Name</label>
                      <input required placeholder="e.g. Iced Caramel Latte" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500">Category</label>
                      <input placeholder="e.g. Coffee" value={newProdCategory} onChange={(e) => setNewProdCategory(e.target.value)} className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500">Sell Price (Rp)</label>
                      <input required type="number" min="0" placeholder="0" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500">Cost Price (Rp)</label>
                      <input type="number" min="0" placeholder="0" value={newProdCogs} onChange={(e) => setNewProdCogs(e.target.value)} className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500">Initial Stock</label>
                      <input required type="number" min="0" placeholder="0" value={newProdStock} onChange={(e) => setNewProdStock(e.target.value)} className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500">Min Safety Stock</label>
                      <input required type="number" min="0" placeholder="0" value={newProdMinStock} onChange={(e) => setNewProdMinStock(e.target.value)} className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                    </div>
                    <button type="submit" disabled={isSavingProduct} className="text-xs p-2.5 bg-[#261CC1] hover:bg-[#1C0770] text-white rounded-xl font-black cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 self-end">
                      <Check className="w-3.5 h-3.5" /> {isSavingProduct ? "Saving..." : "Save to Menu"}
                    </button>
                    {addProductError && <p className="col-span-2 sm:col-span-3 text-[10px] text-rose-600 font-bold">{addProductError}</p>}
                  </form>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <button onClick={() => setDemandFilter("ALL")} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${demandFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}>All</button>
                    <button onClick={() => setDemandFilter("HIGH")} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${demandFilter === "HIGH" ? "bg-rose-50 text-rose-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}>
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> High Demand
                    </button>
                    <button onClick={() => setDemandFilter("STEADY")} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${demandFilter === "STEADY" ? "bg-emerald-50 text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Steady
                    </button>
                    <button onClick={() => setDemandFilter("LOW")} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${demandFilter === "LOW" ? "bg-slate-200 text-slate-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}>
                      <span className="h-2 w-2 rounded-full bg-slate-400" /> Low Demand
                    </button>
                  </div>
                  <button
                    onClick={() => setSortByMargin((prev) => !prev)}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-xl border transition-all shrink-0 cursor-pointer ${sortByMargin ? "bg-[#261CC1] text-white border-[#261CC1]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                  >
                    {sortByMargin ? "✓ Best Margin First" : "Sort: Best Margin"}
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {(() => {
                  const enriched = [...localProducts]
                    .map((p) => {
                      const unitCost = p.cogs || Math.round(p.price * 0.35);
                      const unitProfit = p.price - unitCost;
                      const marginPercent = Math.round((unitProfit / p.price) * 100);
                      const bucket: "HIGH" | "STEADY" | "LOW" = p.salesCount >= 80 ? "HIGH" : (p.salesCount <= 20 || unitProfit <= 0) ? "LOW" : "STEADY";
                      return { p, unitCost, unitProfit, marginPercent, bucket };
                    })
                    .filter((item) => demandFilter === "ALL" || item.bucket === demandFilter)
                    .sort((a, b) => (sortByMargin ? b.marginPercent - a.marginPercent : a.p.name.localeCompare(b.p.name)));

                  if (enriched.length === 0) {
                    return (
                      <p className="text-center py-10 text-xs text-slate-400 font-semibold italic bg-slate-50 border border-dashed rounded-xl">
                        No menu items match this filter yet.
                      </p>
                    );
                  }

                  return enriched.map(({ p, unitCost, unitProfit, marginPercent, bucket }) => {
                    // Peak timing tip
                    const getPeakTiming = (prod: Product) => {
                      const cat = prod.category.toLowerCase();
                      const n = prod.name.toLowerCase();
                      if (cat.includes("coffee") || n.includes("coffee") || n.includes("latte") || n.includes("brew")) {
                        return "Morning Rush (08:00-11:30) - sells about 3x more during the morning commute and meetings.";
                      } else if (cat.includes("bakery") || n.includes("croissant") || n.includes("muffin") || n.includes("donut")) {
                        return "Brunch & Coffee Break (09:00-11:30, 15:00-17:00) - pairs well as a combo with drinks.";
                      } else if (cat.includes("main") || n.includes("rice") || n.includes("salmon") || n.includes("steak")) {
                        return "Lunch (12:00-14:00) & Dinner (18:30-21:00) - the biggest profit driver on weekends.";
                      } else if (cat.includes("sushi") || n.includes("sashimi") || n.includes("roll")) {
                        return "Dinner Rush (17:30-21:00) - orders spike every Friday and Saturday night.";
                      } else {
                        return "Afternoon Lull (14:00-16:30) - a popular pick for a quick snack break.";
                      }
                    };

                    const isBestSeller = p.salesCount >= 100;
                    const isHighMargin = marginPercent >= 65;
                    const isLossMaker = p.salesCount < 25 || unitProfit <= 0;
                    const demandState = bucket === "HIGH"
                      ? { label: "High Demand", tone: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" }
                      : bucket === "LOW"
                        ? { label: "Low Demand", tone: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" }
                        : { label: "Steady Demand", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
                    const aiRecommendation = isLossMaker
                      ? { label: "Needs Action", tone: "bg-rose-50 text-rose-700 border-rose-200", explanation: "Low sales and thin margin on this item - consider a discount, a bundle, or removing it from the active menu." }
                      : isBestSeller
                        ? { label: "Star Performer", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", explanation: "One of your top sellers - keep it well-stocked and consider featuring it more." }
                        : isHighMargin
                          ? { label: "High Margin", tone: "bg-indigo-50 text-indigo-700 border-indigo-200", explanation: "Strong profit margin on this item - a reliable earner for the business." }
                          : { label: "Steady", tone: "bg-slate-100 text-slate-600 border-slate-200", explanation: "Performing consistently - no urgent action needed, just check back weekly." };

                    const isEditing = editingProductId === p.id;
                    const isConfirmingDelete = confirmDeleteProductId === p.id;

                    if (isConfirmingDelete) {
                      return (
                        <div key={p.id} className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm flex items-center justify-between gap-3">
                          <p className="text-xs font-bold text-red-800">
                            Remove "{p.name}" from the active menu? Past sales stay in your revenue history — this just hides it from the current menu and is reversible by request.
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => setConfirmDeleteProductId(null)} disabled={isDeletingProduct} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all cursor-pointer disabled:opacity-50" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteProduct(p)} disabled={isDeletingProduct} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-[11px] font-bold">
                              <Trash2 className="w-3.5 h-3.5" /> {isDeletingProduct ? "Removing..." : "Remove from Menu"}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (isEditing) {
                      return (
                        <div key={p.id} className="rounded-2xl border-2 border-[#261CC1] bg-indigo-50/30 p-4 shadow-sm space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#261CC1]">Editing Menu Item</p>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400">Item Name</label>
                              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Espresso" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400">Category</label>
                              <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="e.g. Coffee" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400">Sell Price (Rp)</label>
                              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="0" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400">Cost Price (Rp)</label>
                              <input type="number" value={editCogs} onChange={(e) => setEditCogs(e.target.value)} placeholder="0" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400">Current Stock</label>
                              <input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} placeholder="0" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400">Minimum Safety Stock</label>
                              <input type="number" value={editMinStock} onChange={(e) => setEditMinStock(e.target.value)} placeholder="0" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#261CC1] font-bold" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button onClick={cancelEditProduct} disabled={isSavingProduct} className="px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 text-[11px] font-bold">
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                            <button onClick={() => saveEditProduct(p)} disabled={isSavingProduct} className="px-3 py-2 bg-[#261CC1] hover:bg-[#1C0770] text-white rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 text-[11px] font-bold">
                              <Check className="w-3.5 h-3.5" /> {isSavingProduct ? "Saving..." : "Save Changes"}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={p.id} className={`rounded-2xl border p-4 shadow-sm transition-all ${isLossMaker ? "border-amber-200 bg-amber-50/40" : isBestSeller ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white hover:border-[#261CC1]/30"}`}>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-700">{p.category}</span>
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${demandState.tone}`}>
                                  <span className={`h-2 w-2 rounded-full ${demandState.dot}`} />
                                  {demandState.label}
                                </span>
                              </div>
                              <h4 className="mt-2 text-sm font-black text-slate-900">{p.name}</h4>
                            </div>
                            <div className="text-right flex items-start gap-2">
                              <div>
                                <p className="text-xs font-black text-slate-800">{formatValue(p.price)}</p>
                                <p className={`text-[10px] font-semibold ${unitProfit <= 0 ? "text-rose-600" : "text-slate-500"}`}>{marginPercent}% margin</p>
                              </div>
                              {p.productId !== undefined && p.sizeId !== undefined && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => startEditProduct(p)} title="Edit this menu item" className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-[#261CC1] rounded-lg transition-all cursor-pointer">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setConfirmDeleteProductId(p.id)} title="Remove this menu item" className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-lg transition-all cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div className="rounded-xl bg-white p-2 border border-slate-100">
                              <p className="text-[8px] uppercase tracking-wider text-slate-400">Stock</p>
                              <p className={`mt-1 font-black ${p.stock <= p.minStock ? "text-amber-600" : "text-slate-800"}`}>{p.stock} u</p>
                            </div>
                            <div className="rounded-xl bg-white p-2 border border-slate-100">
                              <p className="text-[8px] uppercase tracking-wider text-slate-400">Sold</p>
                              <p className="mt-1 font-black text-slate-800">{p.salesCount}</p>
                            </div>
                            <div className="rounded-xl bg-white p-2 border border-slate-100">
                              <p className="text-[8px] uppercase tracking-wider text-slate-400">Profit</p>
                              <p className={`mt-1 font-black ${unitProfit <= 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatValue(unitProfit)}</p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">AI Recommendation</p>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${aiRecommendation.tone}`}>
                                {aiRecommendation.label}
                              </span>
                              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">{aiRecommendation.explanation}</p>
                            </div>
                            <div className="pt-2 border-t border-slate-200/70">
                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Peak Selling Window
                              </p>
                              <p className="text-[11px] leading-relaxed text-slate-600">{getPeakTiming(p)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* F&B Safety & Expiry Diagnostics Tracker */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#E14434]/10 text-[#E14434] rounded-xl">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-slate-950 text-sm uppercase tracking-wider">F&B Safety Diagnostic</h3>
                    <p className="text-[11px] text-slate-500">Real-time freshness, hygiene & temperature audits.</p>
                  </div>
                </div>

                {/* Safety Toast Action feedback */}
                {safetyToast && (
                  <div className={`p-3 rounded-xl text-xs font-bold leading-normal transition-all animate-in slide-in-from-top duration-300 ${
                    safetyToast.type === "success" ? "bg-emerald-50 border border-emerald-100 text-emerald-800" : "bg-rose-50 border border-rose-100 text-[#E14434]"
                  }`}>
                    {safetyToast.text}
                  </div>
                )}

                {/* Safety Summary Chart */}
                <div className="relative h-[160px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Safe", value: safetyProducts.filter(p => p.status === "SAFE").length, color: "#10b981" },
                          { name: "Warning", value: safetyProducts.filter(p => p.status === "WARN").length, color: "#f59e0b" },
                          { name: "Unsafe", value: safetyProducts.filter(p => p.status === "UNSAFE").length, color: "#E14434" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { name: "Safe", value: safetyProducts.filter(p => p.status === "SAFE").length, color: "#10b981" },
                          { name: "Warning", value: safetyProducts.filter(p => p.status === "WARN").length, color: "#f59e0b" },
                          { name: "Unsafe", value: safetyProducts.filter(p => p.status === "UNSAFE").length, color: "#E14434" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center">
                    <p className="text-xl font-black text-slate-900">
                      {Math.round((safetyProducts.filter(p => p.status === "SAFE").length / Math.max(1, safetyProducts.length)) * 100)}%
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Health Score</p>
                  </div>
                </div>

                {/* Legends */}
                <div className="grid grid-cols-3 gap-1 text-[9px] font-bold text-center border-b pb-4 border-slate-100">
                  <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg border border-emerald-100">
                    <p className="text-xs font-black">{safetyProducts.filter(p => p.status === "SAFE").length}</p>
                    <p className="text-[8px] opacity-80 uppercase">Safe</p>
                  </div>
                  <div className="bg-amber-50 text-amber-700 p-1.5 rounded-lg border border-amber-100">
                    <p className="text-xs font-black">{safetyProducts.filter(p => p.status === "WARN").length}</p>
                    <p className="text-[8px] opacity-80 uppercase">Warning</p>
                  </div>
                  <div className="bg-rose-50 text-[#E14434] p-1.5 rounded-lg border border-rose-100">
                    <p className="text-xs font-black">{safetyProducts.filter(p => p.status === "UNSAFE").length}</p>
                    <p className="text-[8px] opacity-80 uppercase">Critical</p>
                  </div>
                </div>

                {/* Alert Lists */}
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Items Needing Immediate Action</p>
                  {safetyProducts.filter(p => p.status !== "SAFE").length === 0 ? (
                    <p className="text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
                      ðŸŽ‰ All items are fully compliant & healthy!
                    </p>
                  ) : (
                    safetyProducts.filter(p => p.status !== "SAFE").map(p => (
                      <div key={p.id} className={`p-2.5 border rounded-xl flex flex-col gap-1.5 transition-all text-left ${
                        p.status === "UNSAFE" ? "bg-rose-50/50 border-rose-100" : "bg-amber-50/50 border-amber-100"
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-xs text-slate-800 truncate max-w-[110px]">{p.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            p.status === "UNSAFE" ? "bg-[#E14434] text-white" : "bg-amber-500 text-white"
                          }`}>{p.status}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-normal bg-white/80 p-1.5 border border-slate-100 rounded-lg">
                          {p.alertReason}
                        </p>
                        <div className="flex gap-1.5 items-center justify-between">
                          <span className="text-[9px] font-mono text-slate-400 font-bold">
                            {p.targetTemp} â€¢ <span className="font-black text-slate-700">{p.actualTemp.toFixed(1)}Â°C</span>
                          </span>
                          <div className="flex gap-1">
                            {p.status === "UNSAFE" ? (
                              <button
                                onClick={() => handleSafetyAction(p.id, "DISCARD", p.name)}
                                className="px-2 py-1 bg-[#E14434] text-white text-[9px] font-black uppercase tracking-wider rounded-lg hover:bg-[#c23325] transition-colors cursor-pointer"
                              >
                                Buang Item
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSafetyAction(p.id, "CALIBRATE", p.name)}
                                className="px-2 py-1 bg-[#5EABD6] text-white text-[9px] font-black uppercase tracking-wider rounded-lg hover:bg-[#4b9cbd] transition-colors cursor-pointer"
                              >
                                Kalibrasi
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Safety Status Banner */}
              <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-2xl flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold tracking-wider uppercase">F&B HACCP Compliant Monitor</span>
              </div>
            </div>
          </div>
            )}
          </div>
        )}

        {/* PANEL 4: SPREADSHEET FEED UPLOAD */}
        {activeTab === "SPREADSHEET_FEED" && (
          <ManagerFileUploader company={company} onDataChanged={onDataChanged} />
        )}

        {/* PANEL 7: CUSTOMER GUESS & FEEDBACK ANALYTICS */}
        {activeTab === "CUSTOMER_GUESS" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#261CC1]" />
                    Customer Insights & Menu Popularity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track your most profitable menu items, plan strategies for slow-moving ones, and manage customer reviews in real time.
                  </p>
                </div>

                {/* Switch Filters */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs shrink-0 self-start">
                  <button
                    onClick={() => setReviewsSortFilter("ALL")}
                    className={`px-3 py-1.5 font-bold rounded-lg cursor-pointer transition-all ${reviewsSortFilter === "ALL" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    All Menu
                  </button>
                  <button
                    onClick={() => setReviewsSortFilter("HIGH_MARGIN")}
                    className={`px-3 py-1.5 font-bold rounded-lg cursor-pointer transition-all ${reviewsSortFilter === "HIGH_MARGIN" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Best Margin
                  </button>
                  <button
                    onClick={() => setReviewsSortFilter("SEPI")}
                    className={`px-3 py-1.5 font-bold rounded-lg cursor-pointer transition-all ${reviewsSortFilter === "SEPI" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Low Demand
                  </button>
                </div>
              </div>

              {/* Menu listings based on filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localProducts
                  .filter((p) => {
                    const cost = p.cogs || Math.round(p.price * 0.35);
                    const margin = Math.round(((p.price - cost) / p.price) * 100);
                    if (reviewsSortFilter === "HIGH_MARGIN") return margin >= 65;
                    if (reviewsSortFilter === "SEPI") return p.salesCount < 40;
                    return true;
                  })
                  .map((p) => {
                    const cost = p.cogs || Math.round(p.price * 0.35);
                    const profit = p.price - cost;
                    const margin = Math.round((profit / p.price) * 100);
                    const isSepi = p.salesCount < 40;
                    const isHighMargin = margin >= 65;

                    return (
                      <div key={p.id} className={`p-4 border rounded-2xl transition-all space-y-3 ${isSepi ? "border-amber-100 bg-amber-50/10" : isHighMargin ? "border-emerald-100 bg-emerald-50/10" : "border-slate-100 bg-slate-50/30"}`}>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {p.category}
                              </span>
                              {isHighMargin && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-[#e6fbf2] text-emerald-800 rounded">
                                  ðŸ’Ž HIGH MARGIN
                                </span>
                              )}
                              {isSepi && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-[#fef8e7] text-amber-800 rounded">
                                  âš ï¸ LOW DEMAND
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-black text-slate-900 mt-1">{p.name}</h4>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs font-black text-[#261CC1]">{formatValue(p.price)}</span>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">Sold: {p.salesCount} units</p>
                          </div>
                        </div>

                        {/* Cost breakdown progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Cost of Goods (COGS): {formatValue(cost)}</span>
                            <span>Profit Margin: {margin}% ({formatValue(profit)})</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full ${isSepi ? "bg-amber-500" : isHighMargin ? "bg-emerald-500" : "bg-indigo-600"}`} style={{ width: `${margin}%` }}></div>
                          </div>
                        </div>

                        {/* AI Prescription / Strategic Recommendation */}
                        <div className="p-3 bg-white/70 border border-slate-100 rounded-xl space-y-1">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#261CC1] fill-[#261CC1]" />
                            AI Strategic Recommendation
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {isSepi
                              ? `This item isn't selling much. Try adding "${p.name}" to an afternoon combo bundle with a 15% discount to boost sales without cutting too deep into margin.`
                              : isHighMargin
                                ? `A top profit driver! Promote "${p.name}" through the flyer broadcast during busy hours to boost daily cash flow.`
                                : `A stable performer. Keep safety stock levels steady to maintain smooth service through the weekend.`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Customer Guest Reviews Section */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#261CC1]" />
                  Manage Guest Reviews & Customer Feedback
                </h3>
                <p className="text-xs text-slate-500">
                  Reviews submitted through the Customer Guess page appear here. Use the AI Generator to draft a tactful, friendly reply.
                </p>
              </div>

              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 font-bold text-xs">
                    No reviews or customer feedback yet for this company.
                  </div>
                ) : (
                  reviews.map((rev) => {
                    const stars = Array(5).fill(0);
                    const hasDraft = !!aiDraftReplies[rev.id];

                    return (
                      <div key={rev.id} className="p-4 border border-slate-100 bg-slate-50/40 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-300">
                              {rev.author[0]}
                            </div>
                            <div>
                              <h5 className="font-extrabold text-slate-900 text-xs">{rev.author}</h5>
                              <p className="text-[10px] text-slate-400 font-mono">{rev.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200/50">
                            {stars.map((_, i) => (
                              <svg key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.174-.374.724-.374.898 0l2.582 5.253 5.79.845c.407.06.57.561.275.854l-4.186 4.083 1.114 5.792c.078.406-.35.717-.714.524l-5.18-2.724-5.18 2.724c-.364.193-.792-.118-.714-.524l1.114-5.792-4.186-4.083c-.294-.293-.13-.794.275-.854l5.79-.845 2.582-5.253z" />
                              </svg>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed italic font-medium bg-white p-3 rounded-xl border border-slate-100">
                          " {rev.comment} "
                        </p>

                        {/* AI Reply generator area */}
                        <div className="space-y-2">
                          {!hasDraft ? (
                            <button
                              onClick={() => {
                                setLoadingDraftId(rev.id);
                                setTimeout(() => {
                                  const greeting = rev.author === "Anonymous Guest" ? "there" : rev.author;
                                  let reply = `Hi ${greeting}, thank you so much for your review and feedback for ${company.name}! `;
                                  if (rev.rating >= 4) {
                                    reply += `We're thrilled our menu hit the spot for you. We're committed to keeping up the quality and service you enjoyed. See you again soon! ðŸ˜Š`;
                                  } else {
                                    reply += `We're sorry to hear about the experience. Your feedback has been passed to the kitchen team for a closer look, and we hope to do much better on your next visit. ðŸ™`;
                                  }
                                  setAiDraftReplies((prev) => ({ ...prev, [rev.id]: reply }));
                                  setLoadingDraftId(null);
                                }, 800);
                              }}
                              disabled={loadingDraftId === rev.id}
                              className="px-3.5 py-1.5 bg-[#261CC1] hover:bg-[#1C0770] disabled:bg-slate-300 text-white font-mono text-[10px] font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 uppercase"
                            >
                              {loadingDraftId === rev.id ? (
                                <>
                                  <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                                  Generating reply...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-[#F1FF5E] fill-[#F1FF5E]" />
                                  Draft AI Reply
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2 animate-in fade-in duration-300">
                              <p className="text-[9px] font-black uppercase text-indigo-800 tracking-wider font-mono flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-700 fill-indigo-700" />
                                AI-Generated Reply
                              </p>
                              <textarea
                                value={aiDraftReplies[rev.id]}
                                onChange={(e) => setAiDraftReplies({ ...aiDraftReplies, [rev.id]: e.target.value })}
                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#261CC1]"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    alert("Reply copied to clipboard!");
                                    navigator.clipboard.writeText(aiDraftReplies[rev.id]);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] font-black rounded-md cursor-pointer uppercase border-0"
                                >
                                  Copy Reply
                                </button>
                                <button
                                  onClick={() => {
                                    setAiDraftReplies((prev) => {
                                      const copy = { ...prev };
                                      delete copy[rev.id];
                                      return copy;
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-[9px] font-black rounded-md cursor-pointer uppercase border-0"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
