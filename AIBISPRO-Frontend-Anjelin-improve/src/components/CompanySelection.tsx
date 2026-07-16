/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Company, User } from "../types";
import { Building2, MapPin, Layers, LayoutDashboard, ArrowRight } from "lucide-react";

interface CompanySelectionProps {
  currentUser: User;
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  onLogout: () => void;
}

export default function CompanySelection({ currentUser, companies, onSelectCompany, onLogout }: CompanySelectionProps) {
  const allowedCompanies = companies;

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center mb-8">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-[#FEFBC7] text-[#E14434] rounded-lg flex items-center justify-center text-xl font-black border border-[#E14434]/10">
            A
          </div>
          <span className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
            AIBIS<span className="text-[#5EABD6]">PRO</span>
          </span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 font-display">
          Choose Company Workspace
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Select the company you want to manage. Your role:{" "}
          <span className="font-semibold text-[#E14434] px-2 py-0.5 bg-[#FFB4B4]/10 rounded-full text-xs">
            {currentUser.role.replace("_", " ")}
          </span>
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allowedCompanies.map((company) => (
            <button
              key={company.id}
              id={`select-workspace-${company.id}`}
              onClick={() => onSelectCompany(company)}
              className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-[#5EABD6] hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer relative overflow-hidden"
            >
              {/* Top Banner accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5EABD6] to-[#FFB4B4] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-3xl shrink-0 group-hover:bg-[#5EABD6]/10 transition-colors">
                  {company.avatarUrl}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#5EABD6] truncate">
                      {company.name}
                    </h3>
                    <span className="inline-flex items-center text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {company.branches} Branches
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#E14434] mt-0.5 uppercase tracking-wide">
                    {company.type}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {company.description}
                  </p>
                  
                  <div className="flex items-center gap-1.5 text-slate-400 mt-4 text-[11px] font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{company.location}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-50 pt-4 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-[#5EABD6]">
                <span>Load Isolated Analytics</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Enter Workspace <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onLogout}
            className="text-xs font-semibold text-slate-500 hover:text-red-500 underline transition-colors cursor-pointer"
          >
            Sign out of {currentUser.name}
          </button>
        </div>
      </div>
    </div>
  );
}
