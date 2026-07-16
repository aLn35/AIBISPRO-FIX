/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Company, User, Currency } from "../types";
import { Building2, ChevronDown, DollarSign, LogOut, Bell, Coins, UserCircle, Globe } from "lucide-react";

interface NavbarProps {
  currentCompany: Company | null;
  companies: Company[];
  currentUser: User;
  currentCurrency: Currency;
  onSwitchCompany: (company: Company) => void;
  onSwitchCurrency: (currency: Currency) => void;
  onLogout: () => void;
  unreadNotificationCount: number;
  onToggleNotificationDrawer: () => void;
}

export default function Navbar({
  currentCompany,
  companies,
  currentUser,
  currentCurrency,
  onSwitchCompany,
  onSwitchCurrency,
  onLogout,
  unreadNotificationCount,
  onToggleNotificationDrawer,
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const allowedCompanies = companies;

  return (
    <header className="h-[72px] bg-white border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Company Switcher */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            id="company-switcher-btn"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-slate-200 rounded-xl hover:border-[#5EABD6] bg-slate-50 hover:bg-white transition-all font-semibold text-slate-800 cursor-pointer text-xs sm:text-sm shadow-sm"
          >
            <span className="text-lg sm:text-xl shrink-0">{currentCompany?.avatarUrl ?? "🌐"}</span>
            <span className="font-display font-extrabold text-[#E14434] truncate max-w-[100px] sm:max-w-[160px]">{currentCompany?.name ?? "All Companies (Portfolio)"}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
              <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Switch Workspace Context
                </p>
                {allowedCompanies.map((c) => (
                  <button
                    key={c.id}
                    id={`switch-to-${c.id}`}
                    onClick={() => {
                      onSwitchCompany(c);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0 cursor-pointer ${
                      currentCompany?.id === c.id ? "bg-[#5EABD6]/10 border-l-4 border-l-[#5EABD6]" : ""
                    }`}
                  >
                    <span className="text-2xl shrink-0">{c.avatarUrl}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-extrabold truncate ${currentCompany?.id === c.id ? "text-[#E14434]" : "text-slate-800"}`}>
                        {c.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">{c.type} • {c.branches} Branches</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Live Date Time in Indonesia / Asia Jakarta standard */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 font-mono shadow-sm">
          <Globe className="w-3.5 h-3.5 text-[#3A9AFF]" />
          <span>WIB (UTC+7) • JAKARTA</span>
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-4">
        {/* Currency Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-sm scale-90 sm:scale-100">
          <button
            onClick={() => onSwitchCurrency("IDR")}
            id="currency-idr-btn"
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentCurrency === "IDR"
                ? "bg-white text-[#E14434] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">IDR (Rp)</span>
            <span className="xs:hidden">IDR</span>
          </button>
          <button
            onClick={() => onSwitchCurrency("USD")}
            id="currency-usd-btn"
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentCurrency === "USD"
                ? "bg-white text-[#E14434] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">USD ($)</span>
            <span className="xs:hidden">USD</span>
          </button>
        </div>

        {/* Notifications */}
        <button
          onClick={onToggleNotificationDrawer}
          id="navbar-notifications-btn"
          className="relative p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-[#5EABD6] transition-all cursor-pointer shrink-0"
        >
          <Bell className="w-5.5 h-5.5" />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-[#E14434] text-white rounded-full text-[10px] font-black flex items-center justify-center animate-bounce">
              {unreadNotificationCount}
            </span>
          )}
        </button>

        <div className="h-6 w-[1px] bg-slate-200"></div>

        {/* Active User Credentials Card */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-extrabold text-slate-800">{currentUser.name}</span>
            <span className="text-[9px] font-black text-[#5EABD6] uppercase tracking-wider">
              {currentUser.role.replace("_", " ")}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 h-10 bg-gradient-to-br from-[#FEFBC7] to-[#FFB4B4] rounded-full flex items-center justify-center border border-slate-200 hover:border-[#5EABD6] transition-colors group relative cursor-pointer shadow-inner">
            <UserCircle className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-[#E14434] group-hover:scale-105 transition-transform" />
          </div>
          
          <button
            onClick={onLogout}
            id="navbar-logout-btn"
            className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-5.5 h-5.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
