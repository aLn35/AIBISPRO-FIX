/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Company, Product, Promotion, Currency } from "../types";
import { EXCHANGE_RATE } from "../mockData";
import {
  PlusCircle,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

interface AdminDashboardProps {
  company: Company;
  promotions: Promotion[];
  currency: Currency;
  onAddProduct: (product: Omit<Product, "id" | "companyId" | "salesCount" | "status">) => void;
  onAddPromotion: (promo: Omit<Promotion, "id" | "companyId" | "conversionRate" | "revenueGenerated">) => void;
}

export default function AdminDashboard({
  company,
  promotions,
  currency,
  onAddProduct,
  onAddPromotion,
}: AdminDashboardProps) {

  // States for adding a new product
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState("Coffee");
  const [pPrice, setPPrice] = useState("");
  const [pCogs, setPCogs] = useState("");
  const [pStock, setPStock] = useState("");
  const [pMinStock, setPMinStock] = useState("");
  const [pSuccessMsg, setPSuccessMsg] = useState("");

  // Campaign templates for selection
  const CAMPAIGN_TEMPLATES = [
    {
      name: "Coffee Morning Rush Booster",
      type: "DISCOUNT" as const,
      discountPercent: 15,
      description: "15% off espresso-based drinks from 7:00 AM to 10:00 AM to stimulate early-day transactions.",
    },
    {
      name: "Afternoon Sweet Tooth Combo",
      type: "BUNDLE" as const,
      discountPercent: 20,
      description: "Special dessert paired with black coffee to elevate high-margin snack sales between lunch and dinner.",
    },
    {
      name: "Rainy Day Warm-up Deal",
      type: "DISCOUNT" as const,
      discountPercent: 10,
      description: "10% rainy-weather discount on warm meals and beverages to attract customers when foot traffic drops.",
    },
    {
      name: "Sunday Family Feast Platter",
      type: "BUY_1_GET_1" as const,
      discountPercent: 50,
      description: "Buy 1 Get 1 free on selected main courses to drive large group family diners on weekends.",
    }
  ];

  // States for proposing a promo
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<string>("custom");
  const [promoName, setPromoName] = useState("");
  const [promoType, setPromoType] = useState<"DISCOUNT" | "BUNDLE" | "BUY_1_GET_1">("DISCOUNT");
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoStart, setPromoStart] = useState("");
  const [promoEnd, setPromoEnd] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoSuccessMsg, setPromoSuccessMsg] = useState("");

  const handleTemplateChange = (val: string) => {
    setSelectedTemplateIndex(val);
    if (val === "custom") {
      setPromoName("");
      setPromoType("DISCOUNT");
      setPromoDiscount("");
      setPromoDescription("");
    } else {
      const idx = parseInt(val, 10);
      const template = CAMPAIGN_TEMPLATES[idx];
      setPromoName(template.name);
      setPromoType(template.type);
      setPromoDiscount(template.discountPercent ? template.discountPercent.toString() : "");
      setPromoDescription(template.description);
    }
  };

  // Format helper
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

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pPrice || !pCogs || !pStock || !pMinStock) return;

    onAddProduct({
      name: pName,
      category: pCategory,
      price: parseFloat(pPrice),
      cogs: parseFloat(pCogs),
      stock: parseInt(pStock, 10),
      minStock: parseInt(pMinStock, 10),
    });

    setPSuccessMsg(`Successfully added "${pName}" to products database.`);
    setPName("");
    setPPrice("");
    setPCogs("");
    setPStock("");
    setPMinStock("");
    setTimeout(() => setPSuccessMsg(""), 4000);
  };

  const handleProposePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName || !promoStart || !promoEnd) return;

    onAddPromotion({
      name: promoName,
      type: promoType,
      discountPercent: promoType === "DISCOUNT" && promoDiscount ? parseInt(promoDiscount, 10) : undefined,
      startDate: promoStart,
      endDate: promoEnd,
      status: "PENDING_APPROVAL", // operational admin drafts as pending for managers to approve
      description: promoDescription,
    });

    setPromoSuccessMsg(`Proposal for "${promoName}" forwarded for Manager & Owner review!`);
    setPromoName("");
    setPromoDiscount("");
    setPromoStart("");
    setPromoEnd("");
    setPromoDescription("");
    setSelectedTemplateIndex("custom");
    setTimeout(() => setPromoSuccessMsg(""), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Center Column: Proposals */}
        <div className="lg:col-span-2 space-y-6">
          {/* DRAFT PROMOTION CAMPAIGN */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-display font-extrabold text-slate-900 text-lg mb-2 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#E14434]" />
              Propose Discount Campaign / Promo
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select a pre-designed strategic marketing campaign template or formulate a custom one. It will go to the Manager and Owner for live approval.
            </p>

            {promoSuccessMsg && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 mb-4 rounded-md text-sm text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {promoSuccessMsg}
              </div>
            )}

            <form onSubmit={handleProposePromo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Choose Strategic Template</label>
                <select
                  value={selectedTemplateIndex}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-indigo-50/40 text-slate-900 font-bold"
                >
                  <option value="custom">&mdash; Formulation Custom Campaign &mdash;</option>
                  {CAMPAIGN_TEMPLATES.map((tpl, idx) => (
                    <option key={idx} value={idx}>{tpl.name} ({tpl.type === "DISCOUNT" ? `${tpl.discountPercent}% Off` : tpl.type.replace(/_/g, " ")})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={promoName}
                  onChange={(e) => setPromoName(e.target.value)}
                  placeholder="e.g. Students Mid-Year Smash Special"
                  id="promo-form-name"
                  className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Promo Mechanism</label>
                <select
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value as any)}
                  id="promo-form-type"
                  className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
                >
                  <option value="DISCOUNT">Percentage Discount</option>
                  <option value="BUY_1_GET_1">Buy 1 Get 1 Free</option>
                  <option value="BUNDLE">Special Menu Bundle Combo</option>
                </select>
              </div>

              {promoType === "DISCOUNT" && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Discount Percent (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={promoDiscount}
                    onChange={(e) => setPromoDiscount(e.target.value)}
                    placeholder="e.g. 15"
                    id="promo-form-percent"
                    className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900 font-mono font-bold"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Campaign Goal & Description</label>
                <textarea
                  required
                  value={promoDescription}
                  onChange={(e) => setPromoDescription(e.target.value)}
                  placeholder="Explain the strategy or promotional goals..."
                  rows={2}
                  className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={promoStart}
                    onChange={(e) => setPromoStart(e.target.value)}
                    id="promo-form-start"
                    className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={promoEnd}
                    onChange={(e) => setPromoEnd(e.target.value)}
                    id="promo-form-end"
                    className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end mt-2">
                <button
                  type="submit"
                  id="promo-submit-btn"
                  className="bg-[#261CC1] hover:bg-[#1C0770] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Forward Proposal to Owner
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Add New Product to catalog */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-fit">
          <h3 className="font-display font-extrabold text-slate-900 text-lg mb-2 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#261CC1]" />
            Register Product in Catalog
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Incorporate a brand new offering into your branch sales menu.
          </p>

          {pSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-lg mb-4 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {pSuccessMsg}
            </div>
          )}

          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name</label>
              <input
                type="text"
                required
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="e.g. Avocado Choco Macchiato"
                id="product-form-name"
                className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category Group</label>
              <select
                value={pCategory}
                onChange={(e) => setPCategory(e.target.value)}
                id="product-form-category"
                className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
              >
                <option value="Coffee">Coffee Group</option>
                <option value="Non-Coffee">Non-Coffee Drinks</option>
                <option value="Bakery">Bakery / Pastry</option>
                <option value="Main Course">Main Meals</option>
                <option value="Sides">Sides / Snacks</option>
                <option value="Dessert">Dessert Specials</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Price (IDR)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={pPrice}
                  onChange={(e) => setPPrice(e.target.value)}
                  placeholder="35000"
                  id="product-form-price"
                  className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unit COGS (IDR)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={pCogs}
                  onChange={(e) => setPCogs(e.target.value)}
                  placeholder="9000"
                  id="product-form-cogs"
                  className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Stock Qty</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={pStock}
                  onChange={(e) => setPStock(e.target.value)}
                  placeholder="100"
                  id="product-form-stock"
                  className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reorder Point Level</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={pMinStock}
                  onChange={(e) => setPMinStock(e.target.value)}
                  placeholder="25"
                  id="product-form-min-stock"
                  className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              id="product-submit-btn"
              className="w-full bg-[#261CC1] hover:bg-[#1C0770] text-white py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md mt-2"
            >
              Add to Catalog Registry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
