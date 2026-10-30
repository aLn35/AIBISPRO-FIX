/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User, Role } from "../types";
import {
  LayoutDashboard,
  LineChart,
  Warehouse,
  BotMessageSquare,
  Activity,
  ChevronLeft,
  ChevronRight,
  Shield,
  Settings,
  HelpCircle,
  Mail,
} from "lucide-react";

interface SidebarProps {
  currentUser: User;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeView: string;
  onChangeView: (view: string) => void;
  lowStockCount: number;
  advisorInboxCount: number;
}

export default function Sidebar({
  currentUser,
  collapsed,
  onToggleCollapse,
  activeView,
  onChangeView,
  lowStockCount,
  advisorInboxCount,
}: SidebarProps) {
  
  const menuItems = [
    {
      id: "DASHBOARD",
      label: "CEO Control Center",
      role: ["OWNER"],
      icon: LayoutDashboard,
      description: "Executive Q&A, KPI dashboards",
    },
    {
      id: "MANAGER_DASHBOARD",
      label: "Operations Control",
      role: ["MANAGER"],
      icon: Shield,
      description: "Executive summary, same view as Owner",
    },
    {
      id: "SUPER_ADMIN",
      label: "Partnership HQ",
      role: ["MAINTAINANCE"],
      icon: Activity,
      description: "Cross-company health, partnerships",
    },
    {
      id: "FINANCIAL_INTELLIGENCE",
      label: "Financial Center",
      role: ["OWNER", "MANAGER"],
      icon: LineChart,
      description: "Cash flow, margin trends & COGS",
    },
    {
      id: "OPERATIONS",
      label: "Inventory & Products",
      role: ["OWNER", "MANAGER"],
      icon: Warehouse,
      description: "Approval Center, catalogs & logistics",
      badge: lowStockCount > 0 ? "LOW_STOCK" : undefined,
      badgeCount: lowStockCount,
    },
    {
      id: "ADVISOR_INBOX",
      label: "Team Inbox",
      role: ["OWNER", "MANAGER"],
      icon: Mail,
      description: "Chat with your consultant & team",
      badge: advisorInboxCount > 0 ? "ADVISOR" : undefined,
      badgeCount: advisorInboxCount,
    },
    {
      id: "ACCOUNT_SETTINGS",
      label: "Account Settings",
      role: ["OWNER", "MANAGER", "MAINTAINANCE"],
      icon: Settings,
      description: "Configure accounts & credentials",
    },
    {
      id: "AI_ASSISTANT",
      label: "AI Advisor",
      role: ["OWNER", "MANAGER", "MAINTAINANCE"],
      icon: BotMessageSquare,
      description: "AIBISPRO Virtual Consultant",
      highlight: true,
    },
  ];

  // Filter menu items by active user role
  const allowedItems = menuItems.filter((item) =>
    item.role.includes(currentUser.role)
  );

  return (
    <aside
      className="bg-white border-r border-slate-200 text-slate-800 flex flex-col h-screen sticky top-0 transition-all duration-300 shadow-sm select-none z-30"
      style={{ width: collapsed ? "80px" : "280px" }}
    >
      {/* Brand Header */}
      <div className="h-[72px] border-b border-slate-100 flex items-center justify-between px-5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 bg-[#FEFBC7] text-[#E14434] rounded-xl flex items-center justify-center font-black shrink-0 text-lg shadow-md font-display border border-[#E14434]/10">
            A
          </div>
          {!collapsed && (
            <span className="font-display text-xl font-black tracking-tight whitespace-nowrap text-slate-900">
              AIBIS<span className="text-[#5EABD6]">PRO</span>
            </span>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-800"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* User Mini Profile */}
      {!collapsed && (
        <div className="px-5 py-4 border-b border-slate-100 bg-[#FEFBC7]/20 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#5EABD6]/10 text-[#5EABD6] flex items-center justify-center font-bold text-sm border border-[#5EABD6]/20">
            {(currentUser?.name || "User").split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-slate-900">{currentUser?.name || "User"}</p>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider font-mono mt-0.5 uppercase">
              {(currentUser?.role || "USER").replace("_", " ")}
            </p>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id.toLowerCase()}`}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left cursor-pointer relative group ${
                isActive
                  ? "bg-[#5EABD6] text-white shadow-md font-bold"
                  : item.highlight
                  ? "bg-[#FFB4B4]/20 hover:bg-[#FFB4B4]/35 text-[#E14434] font-bold"
                  : "text-slate-600 hover:bg-[#FEFBC7]/30 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : item.highlight ? "text-[#E14434]" : "text-slate-400 group-hover:text-slate-700"}`} />
              
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate leading-none mb-1">{item.label}</p>
                  <p className={`text-[10px] leading-none ${isActive ? "text-white/80" : "text-slate-400"} truncate`}>
                    {item.description}
                  </p>
                </div>
              )}

              {/* Status Indicator Badges */}
              {(item.badge === "LOW_STOCK" || item.badge === "ADVISOR") && item.badgeCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${collapsed ? "absolute top-1 right-1" : "ml-auto"} bg-[#E14434] text-white animate-pulse`}>
                  {item.badgeCount}
                </span>
              )}

              {/* Subtle Indicator for active */}
              {isActive && !collapsed && (
                <div className="absolute right-0 top-3 bottom-3 w-1 bg-[#E14434] rounded-l-md"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-100 text-center bg-slate-50 text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
        {!collapsed ? (
          <div>
            <p>&copy; 2026 AIBISPRO INC</p>
            <p className="text-[9px] text-[#5EABD6] mt-1 font-bold">Multi-Company Edition</p>
          </div>
        ) : (
          <span>V2.6</span>
        )}
      </div>
    </aside>
  );
}
