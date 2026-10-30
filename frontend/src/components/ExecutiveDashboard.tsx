/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Company, FinancialMetric, Product, RevenueForecast, Currency } from "../types";
import ExecutiveSummaryCard from "./ExecutiveSummaryCard";

interface ExecutiveDashboardProps {
  company: Company;
  metrics: FinancialMetric[];
  products: Product[];
  forecast: RevenueForecast | undefined;
  currency: Currency;
}

/** CEO Control Center - Owner-only, read-only Executive Summary. The Approval Center that used
 * to live here has moved to the shared "Inventory & Products" page, since Owner and Manager both
 * need to act on the same approval queue there. */
export default function ExecutiveDashboard({
  company,
  metrics,
  products,
  forecast,
  currency,
}: ExecutiveDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-700 animate-pulse"></span>
            <span className="text-xs font-black uppercase text-indigo-700 font-mono tracking-wider">AIBISPRO BI EXECUTIVE DECISION CENTER</span>
          </div>
          <h2 className="text-xl font-display font-black text-slate-950 mt-1">{company.avatarUrl} {company.name} Corporate Shell</h2>
        </div>
      </div>

      <ExecutiveSummaryCard company={company} metrics={metrics} products={products} forecast={forecast} currency={currency} />
    </div>
  );
}
