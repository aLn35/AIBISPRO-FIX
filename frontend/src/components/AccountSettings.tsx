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
  KeyRound,
  Lock,
  Clock,
  Check,
  X,
} from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api";

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

interface CredentialRequest {
  id: number;
  field: "email" | "password";
  new_email: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  target: { id: number; name: string; email: string; role: string };
  requester: { id: number; name: string };
  reviewer: { id: number; name: string } | null;
}

export default function AccountSettings({ currentUser, companies, allCompanies, onAccessChanged }: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "access" | "security">("profile");
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [selectedUserByCompany, setSelectedUserByCompany] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // --- Credential management (Security tab) ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [secNewEmail, setSecNewEmail] = useState("");
  const [secNewPassword, setSecNewPassword] = useState("");
  const [secConfirmPassword, setSecConfirmPassword] = useState("");
  const [ownerRequestField, setOwnerRequestField] = useState<"email" | "password">("password");
  const [secBusy, setSecBusy] = useState(false);
  const [secMessage, setSecMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [credentialRequests, setCredentialRequests] = useState<CredentialRequest[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [managerNewEmail, setManagerNewEmail] = useState("");
  const [managerNewPassword, setManagerNewPassword] = useState("");

  const canManageAccess = currentUser.role === "MAINTAINANCE" || currentUser.role === "OWNER";
  const companiesForAssignment = currentUser.role === "MAINTAINANCE" ? allCompanies : companies;

  const myManagers = grants.filter(
    (g) => g.users.role === "MANAGER" && companies.some((c) => c.id === String(g.company_id))
  );
  const uniqueMyManagers = Array.from(
    new Map<number, { id: number; name: string; email: string }>(myManagers.map((g) => [g.users.id, g.users])).values()
  );

  const loadCredentialRequests = async () => {
    try {
      const data = await apiGet("/users/credential-requests");
      setCredentialRequests(data);
    } catch (e) {
      console.error("Failed to load credential requests:", e);
    }
  };

  useEffect(() => {
    if (currentUser.role === "MAINTAINANCE" && activeTab === "security") loadCredentialRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUser.role]);

  const resetSecurityForm = () => {
    setCurrentPassword("");
    setSecNewEmail("");
    setSecNewPassword("");
    setSecConfirmPassword("");
  };

  const handleSelfUpdateCredentials = async () => {
    if (!currentPassword) {
      setSecMessage({ type: "error", text: "Enter your current password to confirm this change." });
      return;
    }
    if (!secNewEmail && !secNewPassword) {
      setSecMessage({ type: "error", text: "Enter a new email and/or a new password." });
      return;
    }
    if (secNewPassword && secNewPassword !== secConfirmPassword) {
      setSecMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    setSecBusy(true);
    setSecMessage(null);
    try {
      await apiPatch("/users/me/credentials", {
        currentPassword,
        newEmail: secNewEmail || undefined,
        newPassword: secNewPassword || undefined,
      });
      setSecMessage({ type: "success", text: "Your credentials have been updated." });
      resetSecurityForm();
    } catch (e: any) {
      setSecMessage({ type: "error", text: e.message || "Failed to update credentials." });
    } finally {
      setSecBusy(false);
    }
  };

  const handleOwnerRequestChange = async () => {
    if (!currentPassword) {
      setSecMessage({ type: "error", text: "Enter your current password to confirm this request." });
      return;
    }
    if (ownerRequestField === "email" && !secNewEmail) {
      setSecMessage({ type: "error", text: "Enter the new email you'd like to switch to." });
      return;
    }
    if (ownerRequestField === "password") {
      if (!secNewPassword) {
        setSecMessage({ type: "error", text: "Enter the new password you'd like to switch to." });
        return;
      }
      if (secNewPassword !== secConfirmPassword) {
        setSecMessage({ type: "error", text: "New password and confirmation do not match." });
        return;
      }
    }
    setSecBusy(true);
    setSecMessage(null);
    try {
      await apiPost("/users/credential-requests", {
        currentPassword,
        field: ownerRequestField,
        newEmail: ownerRequestField === "email" ? secNewEmail : undefined,
        newPassword: ownerRequestField === "password" ? secNewPassword : undefined,
      });
      setSecMessage({
        type: "success",
        text: "Request submitted. Maintainance will need to approve it before the change takes effect - they will never see your new password, only that a change was requested.",
      });
      resetSecurityForm();
    } catch (e: any) {
      setSecMessage({ type: "error", text: e.message || "Failed to submit request." });
    } finally {
      setSecBusy(false);
    }
  };

  const handleReviewRequest = async (id: number, approve: boolean) => {
    setSecBusy(true);
    setSecMessage(null);
    try {
      await apiPatch(`/users/credential-requests/${id}/${approve ? "approve" : "reject"}`);
      setSecMessage({ type: "success", text: approve ? "Request approved and applied." : "Request rejected." });
      await loadCredentialRequests();
    } catch (e: any) {
      setSecMessage({ type: "error", text: e.message || "Failed to review request." });
    } finally {
      setSecBusy(false);
    }
  };

  const handleSetManagerCredentials = async () => {
    if (!selectedManagerId) {
      setSecMessage({ type: "error", text: "Select a Manager first." });
      return;
    }
    if (!managerNewEmail && !managerNewPassword) {
      setSecMessage({ type: "error", text: "Enter a new email and/or a new password for this Manager." });
      return;
    }
    setSecBusy(true);
    setSecMessage(null);
    try {
      await apiPatch(`/users/${selectedManagerId}/credentials`, {
        newEmail: managerNewEmail || undefined,
        newPassword: managerNewPassword || undefined,
      });
      setSecMessage({ type: "success", text: "Manager credentials updated." });
      setManagerNewEmail("");
      setManagerNewPassword("");
    } catch (e: any) {
      setSecMessage({ type: "error", text: e.message || "Failed to update Manager credentials." });
    } finally {
      setSecBusy(false);
    }
  };

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
      await apiDelete(`/companies/${companyId}/grant/${userId}`);
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
      await apiPatch(`/companies/${companyId}/partnership`, { status: next });
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
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "security" ? "bg-white text-[#261CC1] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Security
          </button>
          {canManageAccess && (
            <button
              onClick={() => setActiveTab("access")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "access" ? "bg-white text-[#261CC1] shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Company Access
            </button>
          )}
        </div>
      </div>

      {activeTab !== "security" && message && (
        <div className={`p-4 rounded-xl flex items-start gap-2 border ${
          message.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
        }`}>
          {message.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span className="text-xs font-semibold">{message.text}</span>
        </div>
      )}

      {activeTab === "security" && secMessage && (
        <div className={`p-4 rounded-xl flex items-start gap-2 border ${
          secMessage.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
        }`}>
          {secMessage.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span className="text-xs font-semibold">{secMessage.text}</span>
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

          {activeTab === "security" && (
            <div className="space-y-6">
              {currentUser.role === "MAINTAINANCE" && (
                <>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 border-b pb-3 border-slate-100 flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-[#261CC1]" />
                      Edit My Credentials
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-3 font-semibold">
                      As Maintainance, you can update your own email and password directly - no approval needed.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Current Password</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]"
                          placeholder="Required to confirm changes" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">New Email (optional)</label>
                        <input type="email" value={secNewEmail} onChange={(e) => setSecNewEmail(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]"
                          placeholder={currentUser.email} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">New Password (optional)</label>
                        <input type="password" value={secNewPassword} onChange={(e) => setSecNewPassword(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]" />
                      </div>
                      {secNewPassword && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Confirm New Password</label>
                          <input type="password" value={secConfirmPassword} onChange={(e) => setSecConfirmPassword(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]" />
                        </div>
                      )}
                      <button disabled={secBusy} onClick={handleSelfUpdateCredentials}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#261CC1] hover:bg-[#1C0770] text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-40">
                        <Lock className="w-3.5 h-3.5" /> Save Credentials
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 border-b pb-3 border-slate-100 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-500" />
                      Owner Credential Requests
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-3 font-semibold">
                      Owners must request approval to change their email or password. Password requests never reveal the actual password to you.
                    </p>
                    <div className="mt-4 space-y-2">
                      {credentialRequests.length === 0 && (
                        <p className="text-xs text-slate-400 italic py-4 text-center">No credential requests yet.</p>
                      )}
                      {credentialRequests.map((r) => (
                        <div key={r.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {r.target.name} <span className="text-slate-400 font-semibold">({r.target.email})</span>
                            </p>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              Requests to change their{" "}
                              <strong>{r.field === "email" ? `email to ${r.new_email}` : "password"}</strong>
                            </p>
                            <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md mt-1 inline-block ${
                              r.status === "pending" ? "bg-amber-100 text-amber-700" : r.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                            }`}>
                              {r.status.toUpperCase()}
                            </span>
                          </div>
                          {r.status === "pending" && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button disabled={secBusy} onClick={() => handleReviewRequest(r.id, true)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-[11px] rounded-lg cursor-pointer disabled:opacity-40">
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button disabled={secBusy} onClick={() => handleReviewRequest(r.id, false)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold text-[11px] rounded-lg cursor-pointer disabled:opacity-40">
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {currentUser.role === "OWNER" && (
                <>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 border-b pb-3 border-slate-100 flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-[#261CC1]" />
                      Request Credential Change
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-3 font-semibold">
                      Changes to your email or password must be approved by Maintainance. If you request a new password,
                      it is encrypted immediately - Maintainance will only ever see that a request exists, never your password.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Current Password</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]"
                          placeholder="Required to confirm this request" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">What do you want to change?</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl mt-1 w-fit">
                          <button onClick={() => setOwnerRequestField("email")}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${ownerRequestField === "email" ? "bg-white text-[#261CC1] shadow-sm" : "text-slate-600"}`}>
                            Email
                          </button>
                          <button onClick={() => setOwnerRequestField("password")}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${ownerRequestField === "password" ? "bg-white text-[#261CC1] shadow-sm" : "text-slate-600"}`}>
                            Password
                          </button>
                        </div>
                      </div>
                      {ownerRequestField === "email" ? (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">New Email</label>
                          <input type="email" value={secNewEmail} onChange={(e) => setSecNewEmail(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]"
                            placeholder={currentUser.email} />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">New Password</label>
                            <input type="password" value={secNewPassword} onChange={(e) => setSecNewPassword(e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Confirm New Password</label>
                            <input type="password" value={secConfirmPassword} onChange={(e) => setSecConfirmPassword(e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]" />
                          </div>
                        </>
                      )}
                      <button disabled={secBusy} onClick={handleOwnerRequestChange}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#261CC1] hover:bg-[#1C0770] text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-40">
                        <Clock className="w-3.5 h-3.5" /> Submit for Approval
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 border-b pb-3 border-slate-100 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-500" />
                      Manage Manager Credentials
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-3 font-semibold">
                      As their Owner, you set your Managers' email and password directly - no approval step required.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Select Manager</label>
                        <select value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]">
                          <option value="">Select a Manager...</option>
                          {uniqueMyManagers.map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                          ))}
                        </select>
                      </div>
                      {uniqueMyManagers.length === 0 && (
                        <p className="text-xs text-slate-400 italic py-2 text-center">No Managers assigned to your companies yet.</p>
                      )}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">New Email (optional)</label>
                        <input type="email" value={managerNewEmail} onChange={(e) => setManagerNewEmail(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">New Password (optional)</label>
                        <input type="password" value={managerNewPassword} onChange={(e) => setManagerNewPassword(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#261CC1]" />
                      </div>
                      <button disabled={secBusy || !selectedManagerId} onClick={handleSetManagerCredentials}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#261CC1] hover:bg-[#1C0770] text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-40">
                        <Lock className="w-3.5 h-3.5" /> Update Manager Credentials
                      </button>
                    </div>
                  </div>
                </>
              )}

              {currentUser.role === "MANAGER" && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-3 border-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-slate-400" />
                    Managed by Your Owner
                  </h3>
                  <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                    Your email and password are set by the Owner who granted you access. Reach out to them directly if you need
                    your credentials changed.
                  </p>
                </div>
              )}
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
