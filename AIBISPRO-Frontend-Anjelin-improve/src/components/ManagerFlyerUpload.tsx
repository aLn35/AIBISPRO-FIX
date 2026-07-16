/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Company, Promotion } from "../types";
import { Upload, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle, RefreshCcw } from "lucide-react";
import { motion } from "motion/react";

interface ManagerFlyerUploadProps {
  company: Company;
  promotions: Promotion[];
}

export default function ManagerFlyerUpload({
  company,
  promotions,
}: ManagerFlyerUploadProps) {
  const [selectedPromoId, setSelectedPromoId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const activeCompanyPromos = promotions.filter(
    p => p.companyId === company.id && p.status === "ACTIVE"
  );

  useEffect(() => {
    // Set first promo as default if selected is empty
    if (activeCompanyPromos.length > 0 && !selectedPromoId) {
      setSelectedPromoId(activeCompanyPromos[0].id);
    }
  }, [activeCompanyPromos, selectedPromoId]);

  // Load current saved poster for preview
  const [savedPoster, setSavedPoster] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(`promo_poster_${company.id}`);
    if (stored) {
      setSavedPoster(stored);
    } else {
      // Default fallback
      if (company.id === "abc_coffee") {
        setSavedPoster("https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=600");
      } else if (company.id === "xyz_restaurant") {
        setSavedPoster("https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600");
      } else {
        setSavedPoster("https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600");
      }
    }
  }, [company.id]);

  const handleSavePoster = (urlToSave: string) => {
    setError("");
    setSuccess("");
    if (!urlToSave.trim()) {
      setError("Please provide a valid flyer poster image URL or upload a file.");
      return;
    }

    localStorage.setItem(`promo_poster_${company.id}`, urlToSave);
    setSavedPoster(urlToSave);
    setSuccess("Promo flyer poster published successfully! It will now pop up automatically on the Guest Customer Dashboard.");
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
          handleSavePoster(uploadEvent.target.result as string);
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
          handleSavePoster(uploadEvent.target.result as string);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Upload parameters panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-700" />
            Promo Poster Broadcast Center
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Publish high-resolution visual posters (JPG/PNG/GIF) for active campaigns. These flyers pop up dynamically for customers visiting the guest portal.
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
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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

          <div className="flex gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="block flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#261CC1] text-xs bg-slate-50"
              placeholder="e.g. https://images.unsplash.com/photo-..."
            />
            <button
              onClick={() => handleSavePoster(imageUrl)}
              className="px-4 py-2 bg-[#261CC1] hover:bg-[#1C0770] text-white text-xs font-bold rounded-lg cursor-pointer shadow transition-colors"
            >
              Publish URL
            </button>
          </div>
        </div>

        {/* Curated Unsplash Templates to instantly try */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Quick Premium Templates</label>
          <div className="grid grid-cols-3 gap-2">
            {presetTemplates.map(preset => (
              <button
                key={preset.name}
                onClick={() => handleSavePoster(preset.url)}
                className="p-1 border border-slate-100 hover:border-[#261CC1] hover:bg-slate-50 rounded-lg text-left transition-all cursor-pointer group"
              >
                <img src={preset.url} alt={preset.name} className="w-full h-12 object-cover rounded" referrerPolicy="no-referrer" />
                <p className="text-[9px] font-black text-slate-700 truncate mt-1 group-hover:text-[#261CC1]">{preset.name}</p>
              </button>
            ))}
          </div>
        </div>

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
          {savedPoster ? (
            <>
              <img 
                src={savedPoster} 
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
                  {activeCompanyPromos.find(p => p.id === selectedPromoId)?.name || "Default Seasonal Discount Flyer"}
                </h4>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-slate-400">
              <ImageIcon className="w-10 h-10 mb-2" />
              <p className="text-xs font-bold">No custom visual poster published yet.</p>
              <p className="text-[10px] text-center mt-1">Default illustration is being shown on guest menus</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
          <span className="flex items-center gap-1.5 text-emerald-500">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Broadcast System: ONLINE
          </span>
          <button 
            onClick={() => {
              localStorage.removeItem(`promo_poster_${company.id}`);
              setSavedPoster(null);
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <RefreshCcw className="w-3 h-3" />
            <span>Reset to Default Flyer</span>
          </button>
        </div>
      </div>

    </div>
  );
}
