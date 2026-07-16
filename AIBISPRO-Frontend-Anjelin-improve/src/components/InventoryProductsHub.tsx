/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Company, Product, InventoryLog, Promotion, Currency } from "../types";
import { Warehouse, ShoppingBag } from "lucide-react";
import ManagerDashboard from "./ManagerDashboard";
import AdminDashboard from "./AdminDashboard";

interface InventoryProductsHubProps {
  company: Company;
  products: Product[];
  inventoryLogs: InventoryLog[];
  promotions: Promotion[];
  currency: Currency;
  onApproveInventoryLog: (logId: string) => void;
  onRejectInventoryLog: (logId: string) => void;
  onApprovePromotion: (promoId: string) => void;
  onAddProduct: (product: Omit<Product, "id" | "companyId" | "salesCount" | "status">) => void;
  onAddPromotion: (promo: Omit<Promotion, "id" | "companyId" | "conversionRate" | "revenueGenerated">) => void;
}

type HubSection = "INVENTORY" | "PRODUCTS";

export default function InventoryProductsHub({
  company,
  products,
  inventoryLogs,
  promotions,
  currency,
  onApproveInventoryLog,
  onRejectInventoryLog,
  onApprovePromotion,
  onAddProduct,
  onAddPromotion,
}: InventoryProductsHubProps) {
  const [section, setSection] = useState<HubSection>("INVENTORY");

  return (
    <div className="space-y-6">
      {/* Merged Section Switcher */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 w-fit shadow-sm">
        <button
          onClick={() => setSection("INVENTORY")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            section === "INVENTORY" ? "bg-[#5EABD6] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Inventory Logistics</span>
        </button>
        <button
          onClick={() => setSection("PRODUCTS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            section === "PRODUCTS" ? "bg-[#5EABD6] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Products & Catalogs</span>
        </button>
      </div>

      {section === "INVENTORY" ? (
        <ManagerDashboard
          company={company}
          products={products}
          inventoryLogs={inventoryLogs}
          promotions={promotions}
          currency={currency}
          onApproveInventoryLog={onApproveInventoryLog}
          onRejectInventoryLog={onRejectInventoryLog}
          onApprovePromotion={onApprovePromotion}
        />
      ) : (
        <AdminDashboard
          company={company}
          promotions={promotions}
          currency={currency}
          onAddProduct={onAddProduct}
          onAddPromotion={onAddPromotion}
        />
      )}
    </div>
  );
}
