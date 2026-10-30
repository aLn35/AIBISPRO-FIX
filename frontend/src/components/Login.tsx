/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../types";
import {
  KeyRound,
  Mail,
  AlertCircle,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { API_URL, apiGet } from "../api";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

type EntryMode = "LANDING" | "STAFF";

// Real backend-seeded accounts (see backend/prisma/seed.ts) - password is SEED_USER_PASSWORD from the backend .env
const SEEDED_DEMO_USERS: { email: string; name: string; role: User["role"] }[] = [
  { email: "maintainance@aibispro.com", name: "Maintenance Admin", role: "MAINTAINANCE" },
  { email: "owner@aibispro.com", name: "Business Owner", role: "OWNER" },
  { email: "manager@aibispro.com", name: "Store Manager", role: "MANAGER" },
];
// Optional: set VITE_DEMO_PASSWORD in frontend/.env to enable one-click demo login.
const SEEDED_PASSWORD = (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? "";

// Slow-drifting ambient blobs using only the existing palette colors (no gradients).
function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#5EABD6]/10 blur-3xl"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#E14434]/10 blur-3xl"
        animate={{ x: [0, -50, 30, 0], y: [0, 30, -40, 0] }}
        transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 left-1/4 w-[26rem] h-[26rem] rounded-full bg-[#FEFBC7]/40 blur-3xl"
        animate={{ x: [0, 40, -40, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 42, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [entryMode, setEntryMode] = useState<EntryMode>("LANDING");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginWithBackend = async (loginEmail: string, loginPassword: string) => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok) {
        setError("Invalid credentials. Try one of the demo accounts below.");
        return;
      }

      const data = await res.json();
      localStorage.setItem("aibispro_token", data.access_token);

      // Fetch the real companies this account can access (cascading access set by
      // MAINTAINANCE -> OWNER -> MANAGER, see backend CompaniesService).
      let assignedCompanies: string[] = [];
      try {
        const myCompanies = await apiGet("/companies/my");
        assignedCompanies = myCompanies.map((c: any) => String(c.id));
      } catch (e) {
        console.error("Failed to load accessible companies:", e);
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        assignedCompanies,
      };
      onLoginSuccess(user);
    } catch (err) {
      console.error("Login network error:", err);
      setError(`Could not reach the backend server at ${API_URL}. Is it running?`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    loginWithBackend(email.trim(), password);
  };

  const handleQuickLogin = (demoUser: { email: string; name: string; role: User["role"] }) => {
    setEmail(demoUser.email);
    if (!SEEDED_PASSWORD) return;
    setPassword(SEEDED_PASSWORD);
    loginWithBackend(demoUser.email, SEEDED_PASSWORD);
  };

  const handleGuestEntrance = () => {
    onLoginSuccess({
      email: "guest@company.com",
      name: "Guest Customer",
      role: "CUSTOMER",
      assignedCompanies: [],
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] relative overflow-hidden flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AmbientBackground />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-4">
          <div className="w-12 h-12 bg-[#FEFBC7] text-[#E14434] rounded-xl flex items-center justify-center text-2xl font-black shadow-lg border border-[#E14434]/10">
            A
          </div>
          <span className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
            AIBIS<span className="text-[#5EABD6]">PRO</span>
          </span>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 font-display">
          {entryMode === "LANDING" ? "Welcome" : "Business Intelligence Portal"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {entryMode === "LANDING"
            ? "Choose how you'd like to sign in"
            : "Enterprise Multi-Company Analytics Engine"}
        </p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full" style={{ maxWidth: entryMode === "LANDING" ? "38rem" : "28rem" }}>
        <AnimatePresence mode="wait">
          {entryMode === "LANDING" ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                whileHover={{ y: -3 }}
                onClick={handleGuestEntrance}
                id="customer-entry-btn"
                className="text-left bg-white p-6 rounded-2xl shadow-xl border border-slate-100 hover:border-[#5EABD6] transition-colors cursor-pointer group flex flex-col gap-3"
              >
                <div className="w-11 h-11 rounded-xl bg-[#5EABD6]/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[#5EABD6]" />
                </div>
                <div>
                  <p className="font-display font-extrabold text-slate-900">I'm a Customer</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Browse menu, promos, and offers without an account.
                  </p>
                </div>
                <span className="mt-auto text-xs font-bold text-[#5EABD6] flex items-center gap-1 group-hover:gap-2 transition-all">
                  Continue as Customer <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                whileHover={{ y: -3 }}
                onClick={() => setEntryMode("STAFF")}
                id="staff-entry-btn"
                className="text-left bg-white p-6 rounded-2xl shadow-xl border border-slate-100 hover:border-[#E14434] transition-colors cursor-pointer group flex flex-col gap-3"
              >
                <div className="w-11 h-11 rounded-xl bg-[#E14434]/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#E14434]" />
                </div>
                <div>
                  <p className="font-display font-extrabold text-slate-900">I'm Internal Staff</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Sign in as Maintenance, Owner, or Manager.
                  </p>
                </div>
                <span className="mt-auto text-xs font-bold text-[#E14434] flex items-center gap-1 group-hover:gap-2 transition-all">
                  Sign In to Workspace <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <button
                onClick={() => {
                  setEntryMode("LANDING");
                  setError("");
                }}
                className="mb-4 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
                <form className="space-y-6" onSubmit={handleLogin}>
                  {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-red-700 font-medium">{error}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                      Email Address
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5EABD6] focus:border-[#5EABD6] sm:text-sm bg-slate-50 hover:bg-slate-50/50 transition-colors"
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5EABD6] focus:border-[#5EABD6] sm:text-sm bg-slate-50 hover:bg-slate-50/50 transition-colors"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      id="login-btn"
                      disabled={isSubmitting}
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-[#E14434] hover:bg-[#c23325] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5EABD6] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Signing In..." : "Sign In to Workspace"}
                    </button>
                  </div>
                </form>

                {/* Quick Demo Login Cards */}
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-[#5EABD6]" />
                    Select Workspace Demo Credentials
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {SEEDED_DEMO_USERS.map((user) => (
                      <button
                        key={user.email}
                        onClick={() => handleQuickLogin(user)}
                        disabled={isSubmitting}
                        id={`demo-${user.role.toLowerCase()}`}
                        className="p-3 text-left border border-slate-200 hover:border-[#5EABD6] hover:bg-[#5EABD6]/10 rounded-xl transition-all cursor-pointer group flex flex-col justify-between disabled:opacity-50"
                      >
                        <div>
                          <p className="text-[11px] font-extrabold text-slate-800 group-hover:text-[#5EABD6] truncate">
                            {user.name.split(" ")[0]}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate uppercase">
                            {user.role.replace("_", " ")}
                          </p>
                        </div>
                        <span className="text-[9px] text-[#5EABD6] mt-1 font-bold group-hover:underline truncate">
                          {SEEDED_PASSWORD ? "Quick login" : "Fill email"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
