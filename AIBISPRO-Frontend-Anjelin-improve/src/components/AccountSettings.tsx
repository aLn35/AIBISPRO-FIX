/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Company } from "../types";
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Users,
  Building,
  UserPlus,
  Power,
  PowerOff,
  Link2,
  Unlink,
} from "lucide-react";
import { apiGet, apiPost } from "../api";

interface AccountSettingsProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  companies: Company[]; // companies THIS user can access
  allCompanies: Company[]; // full platform list (populated for MAINTAINANCE)
  onAccessChanged: () => void;
}

interface AssignableUser {
  id: number;
  name: string;
  email: string;
}

interface AccessGrant {
  id: number;
  user_id: number;
  company_id: number;
  users: { id: number; name: string; email: string; role: string };
  companies: { id: number; name: string };
}

export default function AccountSettings({ currentUser, companies, allCompanies, onAccessChanged }: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "access">("profile");
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [selectedUserByCompany, setSelectedUserByCompany] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const canManageAccess = currentUser.role === "MAINTAINANCE" || currentUser.role === "OWNER";
  const companiesForAssignment = currentUser.role === "MAINTAINANCE" ? allCompanies : companies;

  const loadAccessData = async () => {
    try {
      const [users, allGrants] = await Promise.all([
        apiGet("/companies/assignable-users"),
        apiGet("/companies/access"),
      ]);
      setAssignableUsers(users);
      setGrants(allGrants);
    } catch (e) {
      console.error("Failed to load access data:", e);
    }
  };

  useEffect(() => {
    if (canManageAccess) loadAccessData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.role]);

  const grantsForCompany = (companyId: string) => grants.filter((g) => String(g.company_id) === companyId);

  const handleGrant = async (companyId: string) => {
    const userId = selectedUserByCompany[companyId];
    if (!userId) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiPost(`/companies/${companyId}/grant`, { userId: Number(userId) });
      setMessage({ type: "success", text: "Access granted successfully." });
      await loadAccessData();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to grant access." });
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (companyId: string, userId: number) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`http://localhost:3000/companies/${companyId}/grant/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("aibispro_token")}` },
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage({ type: "success", text: "Access revoked." });
      await loadAccessData();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to revoke access." });
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePartnership = async (companyId: string, current: "active" | "inactive" | undefined) => {
    const next = current === "active" ? "inactive" : "active";
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`http://localhost:3000/companies/${companyId}/partnership`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("aibispro_token")}` },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage({ type: "success", text: `Partnership set to ${next}.` });
      onAccessChanged();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to update partnership status." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#261CC1]" />
            Account & Company Access
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            {currentUser.role === "MAINTAINANCE"
              ? "Curate which companies are active partners, and assign them to Owner accounts."
              : currentUser.role === "OWNER"
              ? "Assign your companies to Manager accounts."
              : "View your session and assigned companies."}
          </p>
        </div>

        {canManageAccess && (
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "profile" ? "bg-white text-[#261CC1] shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              My Profile
            </button>
            <button
              onClick={() => setActiveTab("access")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "access" ? "bg-white text-[#261CC1] shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Company Access
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-2 border ${
          message.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
        }`}>
          {message.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span className="text-xs font-semibold">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Session + assigned companies summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-3 border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Active Session
            </h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#3A9AFF]/10 text-[#3A9AFF] flex items-center justify-center font-extrabold text-lg border border-[#3A9AFF]/20 shadow-inner">
                  {currentUser.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">{currentUser.name}</h4>
                  <span className="text-[10px] font-mono font-bold bg-[#5EABD6]/10 text-[#5EABD6] px-2 py-0.5 rounded-full uppercase tracking-wider block mt-0.5 w-fit">
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</span>
                  <span className="font-mono text-slate-700 font-semibold">{currentUser.email}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-3 border-slate-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-500" />
              My Companies
            </h3>
            <p className="text-[11px] text-slate-500 mt-2 font-semibold">
              You currently have access to these companies:
            </p>
            <div className="mt-3 space-y-2">
              {companies.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">No companies assigned yet.</p>
              )}
              {companies.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{c.avatarUrl}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{c.type}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md ${
                    c.partnershipStatus === "inactive" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {(c.partnershipStatus ?? "active").toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: profile or access management */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "profile" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-3 border-slate-100 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-[#261CC1]" />
                Session Details
              </h3>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                Signed in as <strong>{currentUser.name}</strong> ({currentUser.email}) with role <strong>{currentUser.role}</strong>.
                Use the <strong>Company Access</strong> tab to manage which companies your team can see.
              </p>
            </div>
          )}

          {activeTab === "access" && canManageAccess && (
            <div className="space-y-4">
              {companiesForAssignment.map((c) => {
                const companyGrants = grantsForCompany(c.id);
                return (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{c.avatarUrl}</span>
                        <div>
                          <p className="text-sm font-extrabold text-slate-800">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{c.type}</p>
                        </div>
                      </div>

                      {currentUser.role === "MAINTAINANCE" && (
                        <button
                          disabled={busy}
                          onClick={() => handleTogglePartnership(c.id, c.partnershipStatus)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                            c.partnershipStatus === "inactive"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                          }`}
                        >
                          {c.partnershipStatus === "inactive" ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          {c.partnershipStatus === "inactive" ? "Reactivate Partnership" : "Drop Partnership"}
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {companyGrants.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">
                          No {currentUser.role === "MAINTAINANCE" ? "Owner" : "Manager"} assigned yet.
                        </p>
                      )}
                      {companyGrants.map((g) => (
                        <span key={g.id} className="flex items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-full font-semibold text-slate-700">
                          {g.users.name} ({g.users.role})
                          <button
                            disabled={busy}
                            onClick={() => handleRevoke(c.id, g.user_id)}
                            className="text-slate-400 hover:text-red-500 disabled:opacity-50 cursor-pointer"
                            title="Revoke access"
                          >
                            <Unlink className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={selectedUserByCompany[c.id] ?? ""}
                        onChange={(e) => setSelectedUserByCompany((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]"
                      >
                        <option value="">
                          Select {currentUser.role === "MAINTAINANCE" ? "an Owner" : "a Manager"} to grant access...
                        </option>
                        {assignableUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                      <button
                        disabled={busy || !selectedUserByCompany[c.id]}
                        onClick={() => handleGrant(c.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#261CC1] hover:bg-[#1C0770] text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Grant
                      </button>
                    </div>
                  </div>
                );
              })}

              {assignableUsers.length === 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-2">
                  <UserPlus className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-semibold">
                    No {currentUser.role === "MAINTAINANCE" ? "Owner" : "Manager"} accounts exist yet to assign.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
