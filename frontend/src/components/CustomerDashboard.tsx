/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Company, Product, Promotion, Currency } from "../types";
import { useExchangeRate } from "../exchangeRate";
import { apiGet } from "../api";
import { 
  ShoppingBag, 
  Sparkles, 
  Tag, 
  ArrowRight, 
  ChevronRight, 
  Building2, 
  LogOut,
  X,
  Compass,
  Check,
  Star,
  Receipt
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomerDashboardProps {
  companies: Company[];
  products: Product[];
  promotions: Promotion[];
  currency: Currency;
  onLogout: () => void;
}

export default function CustomerDashboard({
  companies,
  products,
  promotions,
  currency,
  onLogout,
}: CustomerDashboardProps) {
  const EXCHANGE_RATE = useExchangeRate();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id ?? "");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  // companies loads asynchronously after mount (real backend fetch) - once it arrives,
  // default the selection to the first company if nothing valid is selected yet.
  useEffect(() => {
    if (companies.length === 0) return;
    const stillValid = companies.some((c) => c.id === selectedCompanyId);
    if (!stillValid) setSelectedCompanyId(companies[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies]);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [dismissedPromoIds, setDismissedPromoIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("aibispro_dismissed_promos");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("aibispro_dismissed_promos", JSON.stringify(dismissedPromoIds));
  }, [dismissedPromoIds]);

  const handleDismissPromo = (id: string) => {
    setDismissedPromoIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    setShowPromoPopup(false);
  };

  const [activePromoForPopup, setActivePromoForPopup] = useState<Promotion | null>(null);
  const [currentPoster, setCurrentPoster] = useState<string>("");
  const [approvedBundles, setApprovedBundles] = useState<any[]>([]);

  // Customer suggestions, reviews and rating state
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [authorName, setAuthorName] = useState<string>("");
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);

  // Sync reviews with localStorage
  useEffect(() => {
    const getSeedReviews = () => [
      { id: "rev_1", companyId: "abc_coffee", author: "Andi Wijaya", rating: 5, comment: "Iced Palm Sugar Latte nya enak banget! Creamy dan kopinya berasa.", date: "2026-06-20" },
      { id: "rev_2", companyId: "abc_coffee", author: "Siti Rahma", rating: 4, comment: "Tempatnya cozy buat WFH. Croissant-nya renyah.", date: "2026-06-22" },
      { id: "rev_3", companyId: "xyz_restaurant", author: "Budi Santoso", rating: 5, comment: "Nasi Goreng Wagyu Prime worth the price. Daging empuk porsi kenyang.", date: "2026-06-18" },
      { id: "rev_4", companyId: "sushi_house", author: "Clara", rating: 5, comment: "Salmon Aburi Roll bener-bener melting di mulut! Recommended.", date: "2026-06-24" }
    ];

    const stored = localStorage.getItem("aibispro_reviews");
    if (stored) {
      try {
        setReviews(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    } else {
      const seeded = getSeedReviews();
      localStorage.setItem("aibispro_reviews", JSON.stringify(seeded));
      setReviews(seeded);
    }
  }, []);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newReview = {
      id: `rev_${Date.now()}`,
      companyId: selectedCompanyId,
      author: authorName.trim() || "Anonymous Guest",
      rating: rating,
      comment: comment.trim(),
      date: new Date().toISOString().split("T")[0]
    };

    const updated = [newReview, ...reviews];
    setReviews(updated);
    localStorage.setItem("aibispro_reviews", JSON.stringify(updated));

    // Reset form
    setComment("");
    setAuthorName("");
    setRating(5);
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 3000);
  };

  // Load approved combo bundles for the selected company from the real backend.
  useEffect(() => {
    if (!selectedCompanyId) return;
    apiGet(`/bundle-proposals?companyId=${selectedCompanyId}`)
      .then((rows: any[]) => {
        const approved = rows
          .filter((b) => b.status === "approved")
          .map((b) => ({
            id: b.id,
            name: b.name,
            productNames: b.product_names ?? [],
            regularPrice: b.regular_price,
            bundlePrice: b.bundle_price,
            strategy: b.strategy,
          }));
        setApprovedBundles(approved);
      })
      .catch((e) => console.error("Failed to load combo bundles:", e));
  }, [selectedCompanyId]);

  // Find currently selected company details
  const activeCompany = companies.find(c => c.id === selectedCompanyId) || companies[0];

  // Default poster illustrations, used only when the active promo has no real flyer image
  // published yet (see ManagerFlyerUpload, which now saves flyers to promotions.image_url).
  const DEFAULT_POSTERS = [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600",
  ];

  useEffect(() => {
    const activeCompanyPromos = promotions.filter(
      p => p.companyId === selectedCompanyId && p.status === "ACTIVE"
    );

    if (activeCompanyPromos.length > 0) {
      const firstPromo = activeCompanyPromos[0];
      setActivePromoForPopup(firstPromo);
      setCurrentPoster(firstPromo.imageUrl || DEFAULT_POSTERS[Number(selectedCompanyId) % DEFAULT_POSTERS.length]);
      // Only trigger popup if this promo has NOT been dismissed yet by the user!
      setShowPromoPopup(!dismissedPromoIds.includes(firstPromo.id));
    } else {
      setActivePromoForPopup(null);
      setShowPromoPopup(false);
      setCurrentPoster(DEFAULT_POSTERS[Number(selectedCompanyId) % DEFAULT_POSTERS.length]);
    }
  }, [selectedCompanyId, promotions, dismissedPromoIds]);

  // Filter products for selected company
  const companyProducts = products.filter(p => p.companyId === selectedCompanyId);
  
  // Dynamic categories list
  const categories = ["ALL", ...Array.from(new Set(companyProducts.map(p => p.category)))];

  // Filtered menu list
  const filteredProducts = activeCategory === "ALL" 
    ? companyProducts 
    : companyProducts.filter(p => p.category === activeCategory);

  // Active promotions list
  const activePromotions = promotions.filter(p => p.companyId === selectedCompanyId && p.status === "ACTIVE");

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

  if (!activeCompany) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-sm font-bold text-slate-500">Loading partner menus...</p>
        <button
          onClick={onLogout}
          className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl cursor-pointer"
        >
          Back to Staff Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FEFBC7] text-[#E14434] rounded-xl flex items-center justify-center text-xl font-black shadow border border-[#E14434]/10">
            G
          </div>
          <div>
            <h1 className="font-display text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              AIBISPRO Guest Menu
              <span className="text-[10px] bg-[#5EABD6]/10 text-[#5EABD6] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Browse Mode
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold">Self-service digital cafe & restaurant catalog</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Company switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {companies.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCompanyId(c.id);
                  setActiveCategory("ALL");
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  selectedCompanyId === c.id 
                    ? "bg-white text-[#261CC1] shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>{c.avatarUrl}</span>
                <span className="hidden sm:inline">{c.name}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Log out from guest menu"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Back to Staff Login</span>
          </button>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        {/* Left Side: Brand Overview and Active Promotions */}
        <div className="space-y-6">
          {/* Brand Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full mix-blend-multiply filter blur-xl opacity-70 -z-0"></div>
            <div className="relative z-10">
              <span className="text-4xl">{activeCompany.avatarUrl}</span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-3">{activeCompany.name}</h2>
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-1">{activeCompany.type}</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">{activeCompany.description}</p>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-600">
                <Compass className="w-4 h-4 text-[#261CC1]" />
                <span>Branches in {activeCompany.location}</span>
              </div>
            </div>
          </div>

          {/* Active Promos & Deals */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-3 border-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Limited-Time Offers
            </h3>

            {activePromotions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                No active promotional campaigns currently at this branch.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {activePromotions.map(promo => (
                  <div 
                    key={promo.id} 
                    onClick={() => {
                      setActivePromoForPopup(promo);
                      setShowPromoPopup(true);
                    }}
                    className="p-4 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-xl cursor-pointer transition-all flex justify-between items-start group"
                  >
                    <div>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        {promo.type.replace(/_/g, " ")}
                      </span>
                      <h4 className="text-xs font-extrabold text-slate-800 mt-1.5 group-hover:text-[#261CC1] transition-colors">{promo.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Valid until {promo.endDate}</p>
                    </div>
                    {promo.discountPercent && (
                      <span className="text-lg font-black text-[#261CC1] bg-white border border-indigo-100 px-2 py-1 rounded-lg shadow-sm font-mono">
                        -{promo.discountPercent}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Poster Display Trigger Card */}
          {activePromoForPopup && (
            <div className="p-4 bg-[#FEFBC7] text-slate-800 rounded-2xl shadow-sm flex items-center justify-between border border-[#FEFBC7]">
              <div>
                <p className="text-[10px] font-mono text-[#E14434] font-black uppercase tracking-wider">Visual Flyer Active</p>
                <p className="text-xs font-bold mt-1">Want to view the campaign poster?</p>
              </div>
              <button
                onClick={() => setShowPromoPopup(true)}
                className="bg-[#E14434] hover:bg-[#c23325] text-white text-[11px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                View Poster
              </button>
            </div>
          )}

          {/* Customer Reviews & Suggestions Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 border-b pb-3 border-slate-100 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Suggestions & Reviews
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                Let us know what you think about your experience. Your feedback directly shapes our curated menus!
              </p>
            </div>

            {/* Average Rating Stats badge */}
            {(() => {
              const companyReviews = reviews.filter(r => r.companyId === selectedCompanyId);
              const avg = companyReviews.length > 0 
                ? (companyReviews.reduce((sum, r) => sum + r.rating, 0) / companyReviews.length).toFixed(1)
                : "N/A";

              return (
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-500">Average Rating</span>
                    <p className="text-2xl font-black text-slate-800 font-mono flex items-baseline gap-1.5 mt-0.5">
                      {avg}
                      {avg !== "N/A" && <span className="text-xs font-bold text-slate-400">/ 5.0</span>}
                    </p>
                  </div>
                  {avg !== "N/A" && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          className={`w-4 h-4 ${
                            s <= Math.round(Number(avg)) 
                              ? "text-amber-500 fill-amber-500" 
                              : "text-slate-200"
                          }`} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Reviews list - scrollable feed */}
            {(() => {
              const companyReviews = reviews.filter(r => r.companyId === selectedCompanyId);
              return (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {companyReviews.length === 0 ? (
                    <p className="text-center py-4 text-slate-400 text-[11px] font-semibold">Be the first to share your thoughts!</p>
                  ) : (
                    companyReviews.map((rev) => (
                      <div key={rev.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold text-slate-800">{rev.author}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{rev.date}</span>
                        </div>
                        <div className="flex gap-0.5 pb-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              className={`w-3 h-3 ${
                                s <= rev.rating 
                                  ? "text-amber-500 fill-amber-500" 
                                  : "text-slate-200"
                              }`} 
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">"{rev.comment}"</p>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}

            {/* Submit Suggestion Form */}
            <form onSubmit={handleSubmitReview} className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Leave a Suggestion</p>
              
              {reviewSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1.5 animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Thank you! Your feedback has been logged.
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-500">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#261CC1] bg-slate-50/50 hover:bg-slate-50 transition-colors text-slate-800"
                />
              </div>

              {/* Interactive Star Selection */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-500">Your Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setRating(s)}
                      className="p-1 hover:scale-115 transition-transform cursor-pointer"
                    >
                      <Star 
                        className={`w-5 h-5 ${
                          s <= rating 
                            ? "text-amber-500 fill-amber-500" 
                            : "text-slate-300"
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-500">Comments / Suggestion</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Tell us how we can improve or what you loved..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5EABD6] bg-slate-50/50 hover:bg-slate-50 transition-colors text-slate-800 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#E14434] hover:bg-[#c23325] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md text-center"
              >
                Submit Feedback
              </button>
            </form>
          </div>
        </div>

        {/* Center & Right Column: Responsive Menu Catalog & Pricing Index */}
        <div className="lg:col-span-2 space-y-6">
          {/* Menu Search and Categories */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#E14434]" />
                Interactive Food & Drinks List
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Explore our menu and retail price listings</p>
            </div>

            {/* Categories filter list */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer uppercase ${
                    activeCategory === cat 
                      ? "bg-[#5EABD6] text-white shadow" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Approved Strategic Combo Bundles */}
          {approvedBundles.length > 0 && (
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Special Combo Packages
                </h3>
                <p className="text-[11px] text-slate-500 font-bold">Discover our curated favorites paired beautifully together for exceptional value!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {approvedBundles.map(bundle => {
                  const regularSum = bundle.regularPrice;
                  const bundlePrice = bundle.bundlePrice;
                  const discountPct = Math.round(((regularSum - bundlePrice) / regularSum) * 100);

                  return (
                    <div 
                      key={bundle.id} 
                      className="bg-gradient-to-br from-[#FEFBC7] via-[#FFB4B4]/20 to-[#FEFBC7] text-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden border border-[#FEFBC7] group cursor-default"
                    >
                      {/* Interactive visual layout or glow */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#5EABD6] rounded-full mix-blend-screen filter blur-2xl opacity-15"></div>

                      <div className="absolute top-3 right-3 bg-[#E14434] text-white text-[9px] font-black px-2.5 py-0.5 rounded-full font-mono tracking-wider">
                        SAVE {discountPct}%
                      </div>

                      <div className="relative z-10">
                        <h4 className="text-sm font-black text-slate-900 leading-tight pr-14">{bundle.name}</h4>
                        
                        {bundle.strategy && (
                          <p className="text-[11px] text-slate-600 italic mt-2 font-medium leading-relaxed">
                            "{bundle.strategy}"
                          </p>
                        )}

                        <div className="mt-3.5 pt-3 border-t border-slate-200/60">
                          <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Combo Items:</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {bundle.productNames?.map((name: string) => (
                              <span key={name} className="px-2.5 py-0.5 bg-white text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200/60 shadow-xs">
                                🍴 {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-end mt-5 pt-3 border-t border-slate-200/60 relative z-10">
                        <span className="text-[10px] font-black text-[#E14434] uppercase tracking-wider">Special Combo Price</span>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-slate-400 line-through font-mono">Normal: {formatPrice(regularSum)}</p>
                          <span className="text-base font-black text-slate-950 font-mono">{formatPrice(bundlePrice)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu Items Grid - Simple and elegant, name & price only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map(product => {
              return (
                <div 
                  key={product.id}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {product.category}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 pt-1">{product.name}</h4>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-[#261CC1] font-mono">{formatPrice(product.price)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </main>

      {/* Dynamic Pop-up Flyer Modal for Active Promotions */}
      <AnimatePresence>
        {showPromoPopup && activePromoForPopup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-md w-full relative border border-slate-100"
            >
              {/* Close Button */}
              <button
                onClick={() => handleDismissPromo(activePromoForPopup.id)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Promo Poster Banner Graphic */}
              <div className="h-56 relative overflow-hidden bg-slate-900 flex items-center justify-center">
                <img 
                  src={currentPoster} 
                  alt={activePromoForPopup.name} 
                  className="w-full h-full object-cover opacity-90"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="px-2.5 py-1 bg-[#FEFBC7] text-[#E14434] text-[9px] font-black rounded-full uppercase tracking-widest font-mono">
                    Special Offer
                  </span>
                  <h3 className="text-lg font-black text-white mt-1.5 leading-tight">{activePromoForPopup.name}</h3>
                </div>
              </div>

              {/* Promo Details */}
              <div className="p-6">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Promotion Type</p>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">{activePromoForPopup.type.replace(/_/g, " ")}</p>
                
                {activePromoForPopup.discountPercent && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-emerald-800">Direct Discount Applied</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Show this to the barista or cashier</p>
                    </div>
                    <span className="text-2xl font-black text-emerald-700 font-mono">-{activePromoForPopup.discountPercent}%</span>
                  </div>
                )}

                <div className="mt-4 flex justify-between items-center text-xs pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-slate-400 font-semibold">VALID UNTIL</p>
                    <p className="font-bold text-slate-700 font-mono">{activePromoForPopup.endDate}</p>
                  </div>
                  <button
                    onClick={() => handleDismissPromo(activePromoForPopup.id)}
                    className="px-4 py-2 bg-[#E14434] hover:bg-[#c23325] text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
                  >
                    Enjoy Promo!
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
