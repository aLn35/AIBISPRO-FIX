/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Company, Product, Currency } from "../types";
import { EXCHANGE_RATE } from "../mockData";
import { Sparkles, ShoppingCart, HelpCircle, Check, ArrowRight, Hourglass, Plus, X, Trash2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BundleProposal {
  id: string;
  companyId: string;
  name: string;
  productIds: string[];
  productNames: string[];
  regularPrice: number;
  bundlePrice: number;
  strategy: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  submittedTime: string;
}

interface ManagerComboCreatorProps {
  company: Company;
  products: Product[];
  currency: Currency;
}

export default function ManagerComboCreator({
  company,
  products,
  currency,
}: ManagerComboCreatorProps) {
  const [proposals, setProposals] = useState<BundleProposal[]>([]);
  const [bundleName, setBundleName] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bundlePrice, setBundlePrice] = useState<number>(0);
  const [strategy, setStrategy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get matching company products
  const companyProducts = products.filter(p => p.companyId === company.id);

  // Sync with localStorage
  useEffect(() => {
    const checkProposals = () => {
      const stored = localStorage.getItem("aibispro_bundle_proposals");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setProposals(parsed.filter((p: any) => p.companyId === company.id));
        } catch (e) {
          console.error("Failed to parse bundle proposals", e);
        }
      } else {
        // Seed an initial pending bundle proposal for realism
        const initialProposals: BundleProposal[] = [
          {
            id: "BNDL-101",
            companyId: company.id,
            name: "Premium Coffee & Pastry Morning Set",
            productIds: companyProducts.slice(0, 2).map(p => p.id),
            productNames: companyProducts.slice(0, 2).map(p => p.name),
            regularPrice: companyProducts.slice(0, 2).reduce((sum, p) => sum + p.price, 0),
            bundlePrice: Math.round(companyProducts.slice(0, 2).reduce((sum, p) => sum + p.price, 0) * 0.8), // 20% discount
            strategy: "High-margin cross-sell campaign targeting morning corporate executives. Promoted via push-alerts.",
            status: "PENDING_APPROVAL",
            submittedTime: new Date(Date.now() - 3600000 * 5).toISOString()
          }
        ];
        localStorage.setItem("aibispro_bundle_proposals", JSON.stringify(initialProposals));
        setProposals(initialProposals.filter((p: any) => p.companyId === company.id));
      }
    };

    checkProposals();
    const interval = setInterval(checkProposals, 1500);
    return () => clearInterval(interval);
  }, [company.id]);

  const handleAddProductToBundle = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  const calculateRegularPrice = () => {
    return selectedProductIds.reduce((sum, id) => {
      const prod = companyProducts.find(p => p.id === id);
      return sum + (prod ? prod.price : 0);
    }, 0);
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!bundleName.trim()) {
      setError("Please specify a Name for this Package combo.");
      return;
    }
    if (selectedProductIds.length < 2) {
      setError("Please select at least 2 food or drink items to combine into a bundle.");
      return;
    }
    if (bundlePrice <= 0) {
      setError("Bundle price must be greater than zero.");
      return;
    }

    const regularTotal = calculateRegularPrice();
    if (bundlePrice >= regularTotal) {
      setError("Combo price should be lower than standard sum price to incentivize customers!");
      return;
    }

    if (!strategy.trim()) {
      setError("Please explain the strategy (e.g. increase afternoon sales).");
      return;
    }

    const userStored = localStorage.getItem("aibispro_user");
    let isOwner = false;
    if (userStored) {
      try {
        const u = JSON.parse(userStored);
        if (u.role === "OWNER") {
          isOwner = true;
        }
      } catch (e) {}
    }

    const newProposal: BundleProposal = {
      id: "BNDL-" + Math.floor(100 + Math.random() * 900),
      companyId: company.id,
      name: bundleName,
      productIds: selectedProductIds,
      productNames: selectedProductIds.map(id => companyProducts.find(p => p.id === id)?.name || ""),
      regularPrice: regularTotal,
      bundlePrice: Number(bundlePrice),
      strategy,
      status: isOwner ? "APPROVED" : "PENDING_APPROVAL",
      submittedTime: new Date().toISOString()
    };

    // Load full list across all companies, prepend new, and store
    const stored = localStorage.getItem("aibispro_bundle_proposals");
    let allProposals: BundleProposal[] = [];
    if (stored) {
      try {
        allProposals = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    const updated = [newProposal, ...allProposals];
    localStorage.setItem("aibispro_bundle_proposals", JSON.stringify(updated));

    // Reset Form
    setBundleName("");
    setSelectedProductIds([]);
    setBundlePrice(0);
    setStrategy("");
    setSuccess(isOwner ? "Package combo registered and active instantly!" : "Package combo proposal submitted successfully! Owner approval is pending.");
    setProposals(updated.filter(p => p.companyId === company.id));
  };

  const handleDeleteProposal = (id: string) => {
    const stored = localStorage.getItem("aibispro_bundle_proposals");
    if (stored) {
      try {
        const parsed: BundleProposal[] = JSON.parse(stored);
        const updated = parsed.filter(p => p.id !== id);
        localStorage.setItem("aibispro_bundle_proposals", JSON.stringify(updated));
        setProposals(updated.filter(p => p.companyId === company.id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const formatPrice = (amount: number) => {
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

  const regTotal = calculateRegularPrice();
  const savingsPercent = regTotal > 0 ? Math.round(((regTotal - bundlePrice) / regTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Bundle Proposal Creation form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-700" />
            Build Strategic Menu Combo
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Bundle several popular items/food with strategic discount rates. Bundle proposals are sent to the Admin Owner for review and live activation.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 text-xs font-semibold text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-xs font-semibold text-emerald-700 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmitProposal} className="space-y-4">
          {/* Bundle Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Combo Package Name</label>
            <input
              type="text"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#261CC1] text-xs bg-slate-50"
              placeholder="e.g. Afternoon Tea Time Combo"
            />
          </div>

          {/* Product Items Multi-Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Select Items/Foods to Bundle</label>
            <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1 border border-slate-100 p-2 rounded-xl">
              {companyProducts.map(product => {
                const isSelected = selectedProductIds.includes(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleAddProductToBundle(product.id)}
                    className={`p-2 border text-left rounded-lg text-xs transition-all flex justify-between items-center ${
                      isSelected 
                        ? "border-[#261CC1] bg-indigo-50/20 text-[#261CC1] font-bold" 
                        : "border-slate-100 hover:border-slate-300 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="truncate pr-1">{product.name}</span>
                    <span className="font-mono text-[10px] shrink-0 text-slate-500">
                      {isSelected ? <Check className="w-3.5 h-3.5 text-[#261CC1]" /> : formatPrice(product.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Regular price sum vs. Proposed package price */}
          {selectedProductIds.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>Standard Sum Price:</span>
                <span className="font-mono text-slate-700 decoration-red-500 line-through">
                  {formatPrice(regTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">Strategic Package Price</label>
                  <p className="text-[10px] text-slate-400 font-semibold">Decided rate for catalog listing</p>
                </div>
                <div className="relative rounded-md shadow-sm w-36">
                  <input
                    type="number"
                    value={bundlePrice || ""}
                    onChange={(e) => setBundlePrice(Number(e.target.value))}
                    className="block w-full pr-12 pl-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#261CC1]"
                    placeholder="Combo Price"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-[10px] font-bold">{currency}</span>
                  </div>
                </div>
              </div>

              {bundlePrice > 0 && savingsPercent > 0 && (
                <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] font-black">
                  <span className="text-indigo-600">Customer Incentive Savings:</span>
                  <span className="text-emerald-600">-{savingsPercent}% Discount</span>
                </div>
              )}
            </div>
          )}

          {/* Strategy description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Business Strategy Pitch</label>
            <textarea
              rows={2}
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#261CC1] text-xs bg-slate-50"
              placeholder="Describe strategic goals: e.g. cross-selling low stock cake with bestseller coffee to clear shelf."
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-[#261CC1] hover:bg-[#1C0770] focus:outline-none focus:ring-2 focus:ring-[#261CC1] transition-all cursor-pointer"
          >
            Submit Bundle to Owner
          </button>
        </form>
      </div>

      {/* Proposals History List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-display font-extrabold text-slate-900 text-base">
            Active Combo Logs
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Status of your submitted bundle packages. Approved bundles instantly append to the guest customer menu.
          </p>
        </div>

        {proposals.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
            No bundle packages designed yet. Start combining items above.
          </div>
        ) : (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {proposals.map((proposal) => {
              const discount = proposal.regularPrice > 0 
                ? Math.round(((proposal.regularPrice - proposal.bundlePrice) / proposal.regularPrice) * 100) 
                : 0;

              return (
                <div key={proposal.id} className="p-4 border border-slate-100 rounded-xl space-y-3 bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                          proposal.status === "APPROVED" 
                            ? "bg-emerald-100 text-emerald-700" 
                            : proposal.status === "REJECTED" 
                            ? "bg-red-100 text-red-700" 
                            : "bg-amber-100 text-amber-700 animate-pulse"
                        }`}>
                          {proposal.status.replace("_", " ")}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400">{proposal.id}</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 mt-1.5">{proposal.name}</h4>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900 font-mono">{formatPrice(proposal.bundlePrice)}</p>
                      <p className="text-[9px] text-slate-400 font-semibold font-mono">List price</p>
                    </div>
                  </div>

                  {/* Bundled items list */}
                  <div className="bg-white p-2 border border-slate-100 rounded-lg">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Bundled Foods/Drinks</p>
                    <div className="flex flex-wrap gap-1">
                      {proposal.productNames.map(name => (
                        <span key={name} className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[9px] text-slate-600 font-bold">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    " {proposal.strategy} "
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold">
                    <span>Discount pitch: -{discount}%</span>
                    <div className="flex items-center gap-2">
                      <span>Submitted: {new Date(proposal.submittedTime).toLocaleDateString()}</span>
                      {proposal.status !== "APPROVED" && (
                        <button
                          onClick={() => handleDeleteProposal(proposal.id)}
                          className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                          title="Delete proposal"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
