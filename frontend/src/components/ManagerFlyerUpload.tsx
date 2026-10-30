/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Company, Promotion } from "../types";
import { Upload, Image as ImageIcon, AlertCircle, CheckCircle, CalendarDays } from "lucide-react";
import { apiPatch } from "../api";

interface ManagerFlyerUploadProps {
  company: Company;
  promotions: Promotion[];
  onAddPromotion: (promo: Omit<Promotion, "id" | "companyId" | "conversionRate" | "revenueGenerated">) => void;
  onDataChanged?: () => void;
}

// Campaign templates for quick-selection when proposing a new promo.
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
  },
];

export default function ManagerFlyerUpload({
  company,
  promotions,
  onAddPromotion,
  onDataChanged,
}: ManagerFlyerUploadProps) {
  const [selectedPromoId, setSelectedPromoId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // --- Propose Discount Campaign / Promo (creates a new promotion, pending Manager/Owner review) ---
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<string>("custom");
  const [promoName, setPromoName] = useState("");
  const [promoType, setPromoType] = useState<"DISCOUNT" | "BUNDLE" | "BUY_1_GET_1">("DISCOUNT");
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoStart, setPromoStart] = useState("");
  const [promoEnd, setPromoEnd] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoSuccessMsg, setPromoSuccessMsg] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];

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

  const handleProposePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName || !promoStart || !promoEnd) return;
    if (promoStart < todayStr) {
      alert("Campaign start date cannot be in the past. Please pick today or a future date.");
      return;
    }
    if (promoEnd < promoStart) {
      alert("Campaign end date cannot be before the start date.");
      return;
    }

    onAddPromotion({
      name: promoName,
      type: promoType,
      discountPercent: promoType === "DISCOUNT" && promoDiscount ? parseInt(promoDiscount, 10) : undefined,
      startDate: promoStart,
      endDate: promoEnd,
      status: "PENDING_APPROVAL",
      description: promoDescription,
    });

    setPromoSuccessMsg(`Proposal for "${promoName}" forwarded for Manager & Owner review! Once approved, it'll appear below to attach a flyer.`);
    setPromoName("");
    setPromoDiscount("");
    setPromoStart("");
    setPromoEnd("");
    setPromoDescription("");
    setSelectedTemplateIndex("custom");
    setTimeout(() => setPromoSuccessMsg(""), 5000);
  };

  const activeCompanyPromos = promotions.filter(
    p => p.companyId === company.id && p.status === "ACTIVE"
  );

  const selectedPromo = activeCompanyPromos.find(p => p.id === selectedPromoId);

  // Default to the first active promo, and reload the form fields whenever the
  // selection (or the underlying real data) changes - this is per-promotion data
  // from the database now, not a single flyer per company in localStorage.
  useEffect(() => {
    if (activeCompanyPromos.length > 0 && !activeCompanyPromos.some(p => p.id === selectedPromoId)) {
      setSelectedPromoId(activeCompanyPromos[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyPromos.map(p => p.id).join(",")]);

  useEffect(() => {
    setImageUrl(selectedPromo?.imageUrl ?? "");
    setDescription(selectedPromo?.description ?? "");
    setSuccess("");
    setError("");
  }, [selectedPromo?.id, selectedPromo?.imageUrl, selectedPromo?.description]);

  const handleSave = async () => {
    if (!selectedPromo) {
      setError("Select an active campaign to attach a flyer to first.");
      return;
    }
    if (!imageUrl.trim()) {
      setError("Please provide a valid flyer poster image URL or upload a file.");
      return;
    }
    const numericId = selectedPromo.id.split("_promo_")[1];
    if (!numericId) {
      setError("Could not resolve this promotion's database id.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiPatch(`/promotions/${numericId}`, {
        image_url: imageUrl.trim(),
        description: description.trim(),
      });
      setSuccess("Promo flyer published successfully! It will now pop up automatically on the Guest Customer Dashboard.");
      onDataChanged?.();
    } catch (e) {
      setError("Failed to save the flyer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setImageUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setImageUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Premade premium curated catalog cards to easily test beautiful posters!
  const presetTemplates = [
    {
      name: "Cozy Brew Morning",
      url: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80&w=600"
    },
    {
      name: "Fresh Gourmet Kitchen",
      url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600"
    },
    {
      name: "Golden Pastry Hour",
      url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600"
    }
  ];

  return (
    <div className="space-y-6">

      {/* Propose Discount Campaign / Promo - creates the promotion that gets a flyer below once active */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-display font-extrabold text-slate-900 text-lg mb-2 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#E14434]" />
          Propose Discount Campaign / Promo
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Select a pre-designed strategic marketing campaign template or formulate a custom one. It will go to the Manager and Owner for live approval, then appear below once active so you can attach a flyer poster to it.
        </p>

        {promoSuccessMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 mb-4 rounded-md text-sm text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
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
              className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Promo Mechanism</label>
            <select
              value={promoType}
              onChange={(e) => setPromoType(e.target.value as any)}
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
                min={todayStr}
                value={promoStart}
                onChange={(e) => setPromoStart(e.target.value)}
                className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
              <input
                type="date"
                required
                min={promoStart || todayStr}
                value={promoEnd}
                onChange={(e) => setPromoEnd(e.target.value)}
                className="block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 text-slate-900"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end mt-2">
            <button
              type="submit"
              className="bg-[#261CC1] hover:bg-[#1C0770] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Forward Proposal to Owner
            </button>
          </div>
        </form>
      </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Upload parameters panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-700" />
            Promo Poster Broadcast Center
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Publish a visual poster and description for an active campaign. It's saved to the database and pops up for guests browsing {company.name}'s menu.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 text-xs font-semibold text-red-700 rounded flex gap-1 items-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-xs font-semibold text-emerald-700 rounded flex gap-1 items-center">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Campaign association */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Associate with Active Campaign</label>
          {activeCompanyPromos.length === 0 ? (
            <p className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-400 font-semibold italic">
              No active promotions found. Create or approve a promotion first to associate a poster flyer.
            </p>
          ) : (
            <select
              value={selectedPromoId}
              onChange={(e) => setSelectedPromoId(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#261CC1] text-xs bg-slate-50 font-bold"
            >
              {activeCompanyPromos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* File drop or url paste */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase">Upload JPEG/PNG Poster</label>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              dragActive
                ? "border-[#261CC1] bg-indigo-50/20"
                : "border-slate-200 hover:border-[#261CC1] bg-slate-50"
            }`}
          >
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileChange}
              disabled={!selectedPromo}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />

            <div className="flex flex-col items-center justify-center space-y-1">
              <Upload className="w-6 h-6 text-indigo-600 mb-1" />
              <p className="text-[11px] font-bold text-slate-700">Drag & drop poster file here or browse</p>
              <p className="text-[9px] text-slate-400">PNG, JPG, WEBP formats supported</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-px bg-slate-100 flex-1"></span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">or paste internet image url</span>
            <span className="h-px bg-slate-100 flex-1"></span>
          </div>

          <input
            type="text"
            value={imageUrl.startsWith("data:") ? "" : imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder={imageUrl.startsWith("data:") ? "Uploaded file selected - paste a URL to replace it" : "e.g. https://images.unsplash.com/photo-..."}
            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#261CC1] text-xs bg-slate-50"
          />
        </div>

        {/* Editable flyer description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase">Flyer Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the offer shown on this flyer, e.g. terms, validity, what's included..."
            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#261CC1] text-xs bg-slate-50 resize-none"
          />
        </div>

        {/* Curated Unsplash Templates to instantly try */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Quick Premium Templates</label>
          <div className="grid grid-cols-3 gap-2">
            {presetTemplates.map(preset => (
              <button
                key={preset.name}
                onClick={() => setImageUrl(preset.url)}
                type="button"
                className="p-1 border border-slate-100 hover:border-[#261CC1] hover:bg-slate-50 rounded-lg text-left transition-all cursor-pointer group"
              >
                <img src={preset.url} alt={preset.name} className="w-full h-12 object-cover rounded" referrerPolicy="no-referrer" />
                <p className="text-[9px] font-black text-slate-700 truncate mt-1 group-hover:text-[#261CC1]">{preset.name}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !selectedPromo}
          type="button"
          className="w-full py-2.5 bg-[#261CC1] hover:bg-[#1C0770] text-white text-xs font-bold rounded-lg cursor-pointer shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Live Active Poster Preview Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="font-display font-extrabold text-slate-900 text-base">
            Live Guest Screen Preview
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            This flyer modal is shown instantly when customers open the digital catalog menu for {company.name}.
          </p>
        </div>

        <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden shadow-md flex-1 min-h-[220px] max-h-[300px] flex flex-col justify-end relative bg-slate-900">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="Promo Poster Preview"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
              <div className="relative z-10 p-5 text-white">
                <span className="text-[8px] bg-amber-400 text-slate-900 font-extrabold font-mono px-1.5 py-0.5 rounded uppercase">
                  Live Pop-Up Preview
                </span>
                <p className="text-xs font-bold text-slate-300 mt-2">Active Campaign Promo Broadcast</p>
                <h4 className="font-display font-black text-sm text-white mt-1 leading-tight">
                  {selectedPromo?.name || "Select a campaign"}
                </h4>
                {description && (
                  <p className="text-[10px] text-slate-300 mt-1.5 leading-relaxed line-clamp-2">{description}</p>
                )}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-slate-400">
              <ImageIcon className="w-10 h-10 mb-2" />
              <p className="text-xs font-bold">No visual poster published for this campaign yet.</p>
              <p className="text-[10px] text-center mt-1">Upload one or paste a URL to preview it here.</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
          <span className="flex items-center gap-1.5 text-emerald-500">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Broadcast System: ONLINE
          </span>
          <span className="text-slate-300">Data source: promotions table</span>
        </div>
      </div>

    </div>
    </div>
  );
}
