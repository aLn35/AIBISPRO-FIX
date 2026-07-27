/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Company, Product, Currency, BundleProposal } from "../types";
import { EXCHANGE_RATE } from "../mockData";
import { Sparkles, Check, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "../api";

interface ManagerComboCreatorProps {
  company: Company;
  products: Product[];
  currency: Currency;
  onDataChanged?: () => void;
}

interface BackendBundleProposal {
  id: number;
  company_id: number;
  name: string;
  product_ids: number[];
  product_names?: string[];
  regular_price: number;
  bundle_price: number;
  strategy: string | null;
  status: string;
  created_at: string;
}

function mapProposal(raw: BackendBundleProposal): BundleProposal {
  return {
    id: raw.id,
    companyId: raw.company_id,
    name: raw.name,
    productIds: raw.product_ids ?? [],
    productNames: raw.product_names ?? [],
    regularPrice: raw.regular_price,
    bundlePrice: raw.bundle_price,
    strategy: raw.strategy ?? undefined,
    status: (raw.status as BundleProposal["status"]) ?? "pending",
    createdBy: 0,
    createdAt: raw.created_at,
  };
}

export default function ManagerComboCreator({
  company,
  products,
  currency,
  onDataChanged,
}: ManagerComboCreatorProps) {
  const [proposals, setProposals] = useState<BundleProposal[]>([]);
  const [bundleName, setBundleName] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bundlePrice, setBundlePrice] = useState<number>(0);
  const [strategy, setStrategy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyProducts = products.filter(p => p.companyId === company.id);

  const loadProposals = () => {
    apiGet(`/bundle-proposals?companyId=${company.id}`)
      .then((data: BackendBundleProposal[]) => setProposals(data.map(mapProposal)))
      .catch((e) => console.error("Failed to load bundle proposals:", e));
  };

  useEffect(() => {
    loadProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSubmitProposal = async (e: React.FormEvent) => {
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

    const selectedProducts = selectedProductIds
      .map((id) => companyProducts.find((p) => p.id === id))
      .filter((p): p is Product => !!p && p.productId !== undefined);

    if (selectedProducts.length !== selectedProductIds.length) {
      setError("One or more selected items could not be resolved to a real product. Please re-select.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPost("/bundle-proposals", {
        company_id: Number(company.id),
        name: bundleName,
        product_ids: selectedProducts.map((p) => p.productId),
        product_names: selectedProducts.map((p) => p.name),
        regular_price: regularTotal,
        bundle_price: Number(bundlePrice),
        strategy,
      });

      setBundleName("");
      setSelectedProductIds([]);
      setBundlePrice(0);
      setStrategy("");
      setSuccess("Package combo proposal submitted successfully! Owner approval is pending.");
      loadProposals();
      onDataChanged?.();
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit bundle proposal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProposal = async (id: number) => {
    try {
      await apiDelete(`/bundle-proposals/${id}`);
      loadProposals();
    } catch (e) {
      console.error("Failed to delete bundle proposal:", e);
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
            Bundle several popular items/food with strategic discount rates. Bundle proposals are sent to the Owner for review and live activation.
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
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-[#261CC1] hover:bg-[#1C0770] focus:outline-none focus:ring-2 focus:ring-[#261CC1] transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Bundle to Owner"}
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
                          proposal.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : proposal.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700 animate-pulse"
                        }`}>
                          {proposal.status}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400">BNDL-{proposal.id}</span>
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
                      {(proposal.productNames ?? []).map(name => (
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
                      <span>Submitted: {new Date(proposal.createdAt).toLocaleDateString()}</span>
                      {proposal.status !== "approved" && (
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
