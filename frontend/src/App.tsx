/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Company, User, Currency, Product, FinancialMetric, Promotion, Bundle, RevenueForecast, AiInsight, Event, Expense, Notification } from "./types";
import {
  getInitialBundles,
  getInitialEvents,
  getInitialExpenses,
  getInitialNotifications,
} from "./mockData";
import { loadCompanyData, loadMultiCompanyData, loadPublicMenuData, mapCompany } from "./backendMappers";
import { apiGet, apiPost, apiPatch } from "./api";
import { initExchangeRate } from "./exchangeRate";

// Modular UI Views
import Login from "./components/Login";
import CompanySelection from "./components/CompanySelection";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Dashboards
import ExecutiveDashboard from "./components/ExecutiveDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import InventoryProductsHub from "./components/InventoryProductsHub";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import CustomerDashboard from "./components/CustomerDashboard";

// Module views
import FinancialIntelligence from "./components/FinancialIntelligence";
import AiAssistant from "./components/AiAssistant";
import AccountSettings from "./components/AccountSettings";
import InboxThread from "./components/InboxThread";
import BotMascot from "./components/BotMascot";

// Lucide Icons
import {
  Bell,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  // Authentication & Workspace States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]); // companies THIS user can access
  const [allCompanies, setAllCompanies] = useState<Company[]>([]); // full platform list (for MAINTAINANCE curation)
  const [currentCurrency, setCurrentCurrency] = useState<Currency>("IDR");
  const [activeView, setActiveView] = useState<string>("DASHBOARD");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    initExchangeRate();
  }, []);

  // Business Intelligence Databases
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetric[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [forecasts, setForecasts] = useState<RevenueForecast[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [advisorInboxCount, setAdvisorInboxCount] = useState(0);

  // AI assistant network states
  const [showFloatingChat, setShowFloatingChat] = useState(false);

  const canUseChatbot = currentUser?.role === "MAINTAINANCE" || currentUser?.role === "OWNER" || currentUser?.role === "MANAGER";

  // 1. Restore session from LocalStorage on first load
  useEffect(() => {
    const storedUser = localStorage.getItem("aibispro_user");
    const storedToken = localStorage.getItem("aibispro_token");
    if (storedUser && storedToken) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      refreshCompanies(user);
    }

    const storedCurrency = localStorage.getItem("aibispro_currency");
    if (storedCurrency) setCurrentCurrency(storedCurrency as Currency);

    const b = localStorage.getItem("aibispro_bundles");
    if (b) setBundles(JSON.parse(b)); else setBundles(getInitialBundles());

    const ev = localStorage.getItem("aibispro_events");
    if (ev) setEvents(JSON.parse(ev)); else setEvents(getInitialEvents());

    const ex = localStorage.getItem("aibispro_expenses");
    if (ex) setExpenses(JSON.parse(ex)); else setExpenses(getInitialExpenses());

    const not = localStorage.getItem("aibispro_notifications");
    if (not) setNotifications(JSON.parse(not)); else setNotifications(getInitialNotifications());
  }, []);

  // 2. Persist the still-local-only state slices
  useEffect(() => {
    if (bundles.length > 0) localStorage.setItem("aibispro_bundles", JSON.stringify(bundles));
    if (events.length > 0) localStorage.setItem("aibispro_events", JSON.stringify(events));
    if (expenses.length > 0) localStorage.setItem("aibispro_expenses", JSON.stringify(expenses));
    if (notifications.length > 0) localStorage.setItem("aibispro_notifications", JSON.stringify(notifications));
  }, [bundles, events, expenses, notifications]);

  const refreshCompanies = async (user: User) => {
    try {
      if (user.role === "CUSTOMER") {
        // Guest browsing has no auth token - use the public, unauthenticated company list
        // instead of the JWT-guarded /companies/my endpoint.
        const all = await apiGet("/companies");
        const mapped = all.map(mapCompany).filter((c: Company) => c.partnershipStatus !== "inactive");
        setCompanies(mapped);
        setAllCompanies(mapped);
        return mapped;
      }

      const my = await apiGet("/companies/my");
      const mapped = my.map(mapCompany);
      setCompanies(mapped);

      if (user.role === "MAINTAINANCE") {
        const all = await apiGet("/companies");
        setAllCompanies(all.map(mapCompany));
      }
      return mapped;
    } catch (e) {
      console.error("Failed to load companies:", e);
      return [];
    }
  };

  // Loads real company-scoped data whenever the active company changes.
  const loadDataForCompany = async (company: Company) => {
    setIsLoadingData(true);
    try {
      const real = await loadCompanyData(company.id);
      setProducts(real.products);
      setMetrics(real.metrics);
      setPromotions(real.promotions);
      setForecasts(real.forecasts);
      setInsights(real.insights);
    } catch (err) {
      console.error("Failed to load company data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Loads and merges data across every company the user can access (MAINTAINANCE portfolio, or an
  // OWNER managing several companies at once) - used for cross-company summary views.
  const loadDataForAllMyCompanies = async (companyList: Company[]) => {
    if (companyList.length === 0) return;
    setIsLoadingData(true);
    try {
      const real = await loadMultiCompanyData(companyList.map((c) => c.id));
      setProducts(real.products);
      setMetrics(real.metrics);
      setPromotions(real.promotions);
      setForecasts(real.forecasts);
      setInsights(real.insights);
    } catch (err) {
      console.error("Failed to load multi-company data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Auth helper callbacks
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("aibispro_user", JSON.stringify(user));

    if (user.role === "MAINTAINANCE") {
      setActiveView("SUPER_ADMIN");
    } else if (user.role === "OWNER") {
      setActiveView("DASHBOARD");
    } else if (user.role === "MANAGER") {
      setActiveView("MANAGER_DASHBOARD");
    }

    const mapped = await refreshCompanies(user);

    if (user.role === "CUSTOMER") {
      // Guest browsing: only load the public product/promotion menu, never the
      // JWT-guarded /ai/* endpoints (guests have no access token).
      if (mapped.length > 0) {
        setIsLoadingData(true);
        try {
          const real = await loadPublicMenuData(mapped.map((c) => c.id));
          setProducts(real.products);
          setPromotions(real.promotions);
        } catch (err) {
          console.error("Failed to load public menu data:", err);
        } finally {
          setIsLoadingData(false);
        }
      }
      return;
    }

    if (user.role === "MAINTAINANCE") {
      // Portfolio-level view spans every accessible company - no single selection needed.
      await loadDataForAllMyCompanies(mapped);
    } else if (mapped.length === 1) {
      handleSelectCompany(mapped[0]);
    } else if (mapped.length > 1) {
      // Multiple companies: load them all so summary tiles have real numbers even before
      // the user drills into one via CompanySelection.
      await loadDataForAllMyCompanies(mapped);
    }
  };

  const handleSelectCompany = (company: Company) => {
    setCurrentCompany(company);
    localStorage.setItem("aibispro_company", JSON.stringify(company));
    loadDataForCompany(company);

    if (currentUser?.role === "OWNER") {
      setActiveView("DASHBOARD");
    } else if (currentUser?.role === "MANAGER") {
      setActiveView("MANAGER_DASHBOARD");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentCompany(null);
    setCompanies([]);
    setAllCompanies([]);
    localStorage.removeItem("aibispro_user");
    localStorage.removeItem("aibispro_company");
    localStorage.removeItem("aibispro_token");
  };

  const handleSwitchCurrency = (currency: Currency) => {
    setCurrentCurrency(currency);
    localStorage.setItem("aibispro_currency", currency);
  };

  // Live Operations Callbacks:
  const handleAddPromotion = (newPromo: Omit<Promotion, "id" | "companyId" | "conversionRate" | "revenueGenerated">) => {
    if (!currentCompany) return;

    const promoId = `promo_${Date.now()}`;
    const promoRecord: Promotion = {
      ...newPromo,
      id: promoId,
      companyId: currentCompany.id,
      conversionRate: 0,
      revenueGenerated: 0,
    };

    setPromotions((prev) => [promoRecord, ...prev]);

    apiPost("/promotions", {
      title: newPromo.name,
      description: newPromo.description,
      discount_percent: newPromo.discountPercent,
      start_date: newPromo.startDate,
      end_date: newPromo.endDate,
      company_id: Number(currentCompany.id),
    }).catch((e) => console.error("Failed to persist promotion:", e));

    const promoNot: Notification = {
      id: `not_p_${Date.now()}`,
      companyId: currentCompany.id,
      title: "Promotion Proposed",
      message: `Drafted promotion "${newPromo.name}" for Manager/Owner authorization.`,
      type: "INFO",
      read: false,
      date: new Date().toISOString().split("T")[0],
    };
    setNotifications((prev) => [promoNot, ...prev]);
  };

  const handleApprovePromotion = (promoId: string) => {
    if (!currentCompany) return;

    setPromotions((prev) =>
      prev.map((p) => (p.id === promoId ? { ...p, status: "ACTIVE", conversionRate: 15.4, revenueGenerated: 84000000 } : p))
    );

    const numericId = promoId.split("_promo_")[1];
    if (numericId) {
      apiPatch(`/promotions/${numericId}/approve`).catch((e) => console.error("Failed to persist promotion approval:", e));
    }

    const appNot: Notification = {
      id: `not_promo_app_${Date.now()}`,
      companyId: currentCompany.id,
      title: "Campaign Approved",
      message: `Drafted marketing promotion was approved and is now active.`,
      type: "SUCCESS",
      read: false,
      date: new Date().toISOString().split("T")[0],
    };
    setNotifications((prev) => [appNot, ...prev]);
  };

  const handleRejectPromotion = (promoId: string, reason: string) => {
    if (!currentCompany) return;

    setPromotions((prev) =>
      prev.map((p) => (p.id === promoId ? { ...p, status: "REJECTED", rejectReason: reason } : p))
    );

    const numericId = promoId.split("_promo_")[1];
    if (numericId) {
      apiPatch(`/promotions/${numericId}/reject`).catch((e) => console.error("Failed to persist promotion rejection:", e));
    }

    const rejNot: Notification = {
      id: `not_promo_rej_${Date.now()}`,
      companyId: currentCompany.id,
      title: "Campaign Rejected",
      message: `Promotion proposal was rejected. Reason: ${reason}`,
      type: "ALERT",
      read: false,
      date: new Date().toISOString().split("T")[0],
    };
    setNotifications((prev) => [rejNot, ...prev]);
  };


  // Unread team-inbox message count for the active company, shown as a sidebar badge.
  const refreshAdvisorInboxCount = () => {
    if (!currentUser || !currentCompany) return;
    apiGet(`/inbox/unread-count?companyId=${currentCompany.id}`)
      .then((res: { count: number }) => setAdvisorInboxCount(res.count))
      .catch((e) => console.error("Failed to load inbox unread count:", e));
  };

  useEffect(() => {
    refreshAdvisorInboxCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentCompany?.id]);

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllNotificationsRead = () => {
    if (!currentCompany) return;
    setNotifications((prev) => prev.map((n) => (n.companyId === currentCompany.id ? { ...n, read: true } : n)));
  };

  // Helper counts
  const currentCompanyProducts = currentCompany ? products.filter((p) => p.companyId === currentCompany.id) : products;
  const lowStockCount = currentCompanyProducts.filter((p) => p.status === "LOW_STOCK").length;

  const currentCompanyNotifications = currentCompany ? notifications.filter((n) => n.companyId === currentCompany.id) : notifications;
  const unreadNotificationCount = currentCompanyNotifications.filter((n) => !n.read).length;

  const activeForecast = currentCompany ? forecasts.find((f) => f.companyId === currentCompany.id) : forecasts[0];

  // Routing View render logic
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (!currentCompany && currentUser.role !== "MAINTAINANCE" && currentUser.role !== "CUSTOMER" && companies.length > 1) {
    return (
      <CompanySelection
        currentUser={currentUser}
        companies={companies}
        onSelectCompany={handleSelectCompany}
        onLogout={handleLogout}
      />
    );
  }

  if (currentUser.role === "CUSTOMER") {
    return (
      <CustomerDashboard
        companies={allCompanies.length > 0 ? allCompanies : companies}
        products={products}
        promotions={promotions}
        currency={currentCurrency}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="flex bg-[#F7F9FC] min-h-screen">
      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeView={activeView}
        onChangeView={(view) => {
          if (view === "AI_ASSISTANT") {
            setShowFloatingChat(true);
          } else {
            setActiveView(view);
          }
        }}
        lowStockCount={lowStockCount}
        advisorInboxCount={advisorInboxCount}
      />

      {/* Main Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentCompany={currentCompany}
          companies={companies}
          currentUser={currentUser}
          currentCurrency={currentCurrency}
          onSwitchCompany={handleSelectCompany}
          onSwitchCurrency={handleSwitchCurrency}
          onLogout={handleLogout}
          unreadNotificationCount={unreadNotificationCount}
          onToggleNotificationDrawer={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
        />

        {/* Dynamic Workspace Panel Content */}
        <main className="p-6 flex-1 overflow-y-auto">
          {activeView === "SUPER_ADMIN" && currentUser.role === "MAINTAINANCE" && (
            <SuperAdminDashboard
              currentUser={currentUser}
              companies={allCompanies}
              products={products}
              promotions={promotions}
              metrics={metrics}
              currency={currentCurrency}
              onSwitchCompany={handleSelectCompany}
              onChangeView={setActiveView}
            />
          )}

          {activeView === "DASHBOARD" && currentCompany && (
            <ExecutiveDashboard
              company={currentCompany}
              metrics={metrics.filter((m) => m.companyId === currentCompany.id)}
              products={currentCompanyProducts}
              forecast={activeForecast}
              currency={currentCurrency}
            />
          )}

          {activeView === "MANAGER_DASHBOARD" && currentCompany && (
            <ManagerDashboard
              currentUser={currentUser}
              company={currentCompany}
              products={products}
              promotions={promotions}
              metrics={metrics.filter((m) => m.companyId === currentCompany.id)}
              forecast={activeForecast}
              currency={currentCurrency}
              onApprovePromotion={handleApprovePromotion}
              onRejectPromotion={handleRejectPromotion}
              onAddPromotion={handleAddPromotion}
              onDataChanged={() => loadDataForCompany(currentCompany)}
              pageMode="SUMMARY_ONLY"
            />
          )}

          {activeView === "FINANCIAL_INTELLIGENCE" && currentCompany && (
            <FinancialIntelligence
              company={currentCompany}
              metrics={metrics}
              products={currentCompanyProducts}
              promotions={promotions}
              currency={currentCurrency}
            />
          )}

          {activeView === "OPERATIONS" && currentCompany && (
            <InventoryProductsHub
              currentUser={currentUser}
              company={currentCompany}
              products={products}
              promotions={promotions}
              metrics={metrics.filter((m) => m.companyId === currentCompany.id)}
              forecast={activeForecast}
              currency={currentCurrency}
              onApprovePromotion={handleApprovePromotion}
              onRejectPromotion={handleRejectPromotion}
              onAddPromotion={handleAddPromotion}
              onDataChanged={() => loadDataForCompany(currentCompany)}
            />
          )}

          {activeView === "ACCOUNT_SETTINGS" && currentUser && (
            <AccountSettings
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              companies={companies}
              allCompanies={allCompanies}
              onAccessChanged={() => refreshCompanies(currentUser)}
            />
          )}

          {activeView === "ADVISOR_INBOX" && currentCompany && currentUser && (
            <InboxThread company={currentCompany} currentUser={currentUser} onUnreadChange={refreshAdvisorInboxCount} />
          )}
        </main>
      </div>

      {/* Notifications Drawer (Side Overlay) */}
      {showNotificationsDrawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowNotificationsDrawer(false)}></div>
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#E14434]" />
                <h3 className="font-display font-extrabold text-slate-800 text-sm">Workspace Alerts & logs</h3>
              </div>
              <button
                onClick={() => setShowNotificationsDrawer(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentCompanyNotifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 font-medium italic">No active ledger warnings or notifications.</p>
              ) : (
                currentCompanyNotifications.map((n) => (
                  <div key={n.id} className={`p-3 border rounded-xl relative group ${
                    n.type === "ALERT" ? "bg-red-50 border-red-100" : n.type === "SUCCESS" ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
                  }`}>
                    <button
                      onClick={() => handleDismissNotification(n.id)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 hover:text-red-500 text-slate-400 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-start gap-2 pr-4">
                      {n.type === "ALERT" && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                      {n.type === "SUCCESS" && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                      {n.type === "INFO" && <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}

                      <div>
                        <p className={`text-xs font-bold ${
                          n.type === "ALERT" ? "text-red-800" : n.type === "SUCCESS" ? "text-emerald-800" : "text-blue-800"
                        }`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-2 block font-mono">{n.date}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between shrink-0">
              <button
                onClick={handleMarkAllNotificationsRead}
                className="text-xs font-bold text-[#5EABD6] hover:underline cursor-pointer"
              >
                Mark all read
              </button>
              <button
                onClick={() => setNotifications([])}
                className="text-xs font-bold text-slate-400 hover:text-red-500 cursor-pointer"
              >
                Clear all logs
              </button>
            </div>
          </div>
        </>
      )}

      {/* Global Floating AI Advisor Widget - only for roles allowed to use the chatbot */}
      {currentUser && canUseChatbot && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          {/* Chat Window Popup Container */}
          {showFloatingChat && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mb-4 w-[calc(100vw-32px)] sm:w-[420px] h-[580px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            >
              {currentUser && (
                <AiAssistant
                  company={currentCompany}
                  currentUser={currentUser}
                  isFloating={true}
                  onClose={() => setShowFloatingChat(false)}
                />
              )}
            </motion.div>
          )}

          {/* Floating Mascot Button - no background chrome, just the illustration, bigger & animated */}
          <button
            onClick={() => setShowFloatingChat(!showFloatingChat)}
            id="floating-ai-button"
            className="relative flex items-center justify-center cursor-pointer bg-transparent"
            title="Tickle the AIBISPRO AI Advisor"
          >
            {/* Status indicator badge */}
            <span className="absolute top-0 right-0 w-4.5 h-4.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse z-10 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            </span>

            <BotMascot size="xl" interactive />

            {showFloatingChat && (
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10">
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
